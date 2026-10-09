import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { AutonomousCrawler, CrawlLogEntry } from '@/lib/crawler/crawler';
import { analyzeCrawledPages } from '@/lib/crawler/analyzer';
import { calculateOptimizationScore } from '@/lib/crawler/scorer';
import {
  runTechnicalSeoAgent,
  runContentSeoAgent,
  runInternalLinkingAgent,
  runQaAgent,
} from '@/lib/ai/agents';
import { submitToIndexNow, pingSearchEngineSitemaps } from '@/lib/indexing/indexnow';

// In-memory progress tracker for live streaming console
export const globalActiveCrawlLogs: Record<string, CrawlLogEntry[]> = {};

async function discoverSearchKeywords(projectId: string, pages: Array<{ title?: string | null; h1?: string | null; path: string }>) {
  const seeds = Array.from(new Set(
    pages
      .flatMap((page) => [page.title, page.h1, page.path.replace(/[-_/]+/g, ' ')])
      .filter((value): value is string => Boolean(value && value.trim()))
      .map((value) => value.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim())
      .filter((value) => value.length >= 3)
  )).slice(0, 30);

  const suggestions = new Set<string>();
  for (const seed of seeds) {
    try {
      const response = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(seed)}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'ApexSEO-KeywordResearch/1.0' },
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) continue;
      const payload = await response.json();
      for (const suggestion of Array.isArray(payload?.[1]) ? payload[1] : []) {
        if (typeof suggestion === 'string' && suggestion.length >= 3) suggestions.add(suggestion.trim());
      }
    } catch {
      // Public suggestion services are best-effort; the crawl must still complete.
    }
    if (suggestions.size >= 200) break;
  }

  const existing = await prisma.keyword.findMany({ where: { projectId }, select: { term: true } });
  const existingTerms = new Set(existing.map((keyword) => keyword.term.toLowerCase()));
  const discovered = Array.from(suggestions).filter((term) => !existingTerms.has(term.toLowerCase())).slice(0, 200);

  if (discovered.length > 0) {
    await prisma.keyword.createMany({
      data: discovered.map((term) => ({
        projectId,
        term,
        source: 'SITE_CONTENT',
        searchIntent: 'Discovered suggestion',
        trend: 'STABLE',
        rankingUrl: null,
        searchVolume: null,
        difficulty: null,
        currentPosition: null,
        previousPosition: null,
        bestPosition: null,
        ctr: null,
        clicks: 0,
        impressions: 0,
        isOpportunity: false,
        opportunityNote: 'Discovered from live public search suggestions; connect Search Console for verified volume and rankings.',
      })),
    });
  }

  return discovered.length;
}

async function seedKeywordCandidates(projectId: string, domain: string) {
  const pages = await prisma.crawlPage.findMany({
    where: { projectId },
    select: { title: true, h1: true, path: true },
    take: 100,
  });
  const words = new Set<string>();
  const sourceText = [domain, ...pages.flatMap((page) => [page.title, page.h1, page.path])].join(' ');
  for (const word of sourceText.replace(/%20/g, ' ').replace(/[-_/]+/g, ' ').split(/\s+/)) {
    const normalized = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (normalized.length >= 3 && !['https', 'www', 'com', 'online'].includes(normalized)) words.add(normalized);
  }

  const candidates = new Set<string>([
    domain.replace(/^www\./, ''),
    ...Array.from(words).map((word) => `${word} ${domain.replace(/^www\./, '')}`),
    ...Array.from(words).map((word) => `best ${word}`),
    ...Array.from(words).map((word) => `${word} near me`),
  ]);
  const existing = await prisma.keyword.findMany({ where: { projectId }, select: { term: true } });
  const existingTerms = new Set(existing.map((keyword) => keyword.term.toLowerCase()));
  const terms = Array.from(candidates).filter((term) => !existingTerms.has(term.toLowerCase())).slice(0, 100);

  if (terms.length > 0) {
    await prisma.keyword.createMany({
      data: terms.map((term) => ({
        projectId,
        term,
        source: 'SITE_CONTENT',
        searchIntent: 'Site-derived candidate',
        trend: 'STABLE',
        opportunityNote: 'Candidate seeded from live site content. Connect Search Console for verified trend, volume, and position data.',
      })),
    });
  }
  return terms.length;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, maxPages = 20, periodDays = 14 } = body;
    const currentUser = await getCurrentUser();
    const isTagHeartbeat = body.source === 'TAG_HEARTBEAT';

    if (!currentUser && !isTagHeartbeat) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    let project = projectId
      ? await prisma.project.findFirst({ where: { id: projectId, ...(currentUser ? { userId: currentUser.id } : {}) } })
      : currentUser
      ? await prisma.project.findFirst({ where: { userId: currentUser.id }, orderBy: { createdAt: 'desc' } })
      : null;

    if (!project) {
      return NextResponse.json({ success: false, error: 'No project found to crawl' }, { status: 404 });
    }

    await prisma.crawlJob.updateMany({
      where: {
        projectId: project.id,
        status: 'RUNNING',
        createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
      },
      data: { status: 'FAILED', completedAt: new Date(), errorMessage: 'Worker did not complete within the expected time.' },
    });

    const seededKeywordCount = await seedKeywordCandidates(project.id, project.domain);
    if (seededKeywordCount > 0) {
      await prisma.auditLog.create({
        data: {
          projectId: project.id,
          action: 'KEYWORD_CANDIDATES_SEEDED',
          details: `Seeded ${seededKeywordCount} site-derived keyword candidates while the crawl worker starts.`,
        },
      });
    }

    const autopilotConfig = await prisma.autopilotConfig.findUnique({ where: { projectId: project.id } });
    if (isTagHeartbeat) {
      const embedTag = await prisma.integration.findFirst({ where: { projectId: project.id, type: 'EMBED_TAG', isConnected: true } });
      // Rapid automated interval: can execute every 60 seconds (1 minute) to ensure new URLs and content changes are always dispatched
      const recentRun = project.lastCrawlAt && Date.now() - project.lastCrawlAt.getTime() < 60 * 1000;
      if (!embedTag || !autopilotConfig?.enabled || autopilotConfig.mode !== 'AUTONOMOUS' || recentRun || project.crawlStatus === 'RUNNING') {
        return NextResponse.json({ success: true, skipped: true, message: 'Autonomous interval pulse active (1m interval).' });
      }
    }
    const effectiveMaxPages = Math.min(500, Math.max(1, Number(maxPages) || project.crawlMaxPages));

    const normalizedPeriodDays = Math.min(365, Math.max(1, Number(periodDays) || 14));
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + normalizedPeriodDays);

    // Create Crawl Job
    const crawlJob = await prisma.crawlJob.create({
      data: {
        projectId: project.id,
        status: 'RUNNING',
        periodStart,
        periodEnd,
        startedAt: new Date(),
        maxPages: effectiveMaxPages,
      },
    });

    globalActiveCrawlLogs[crawlJob.id] = [
      {
        timestamp: new Date().toISOString(),
        type: 'INFO',
        message: `Job initialized for ${project.url}`,
      },
    ];

    // Update project crawl status
    await prisma.project.update({
      where: { id: project.id },
      data: { crawlStatus: 'RUNNING' },
    });

    // Execute crawl asynchronously
    (async () => {
      try {
        const crawler = new AutonomousCrawler({
          startUrl: project.url,
          maxPages: effectiveMaxPages,
          maxDepth: project.crawlMaxDepth,
          userAgent: project.crawlerUserAgent,
          onProgress: (log) => {
            if (!globalActiveCrawlLogs[crawlJob.id]) {
              globalActiveCrawlLogs[crawlJob.id] = [];
            }
            globalActiveCrawlLogs[crawlJob.id].push(log);
          },
        });

        const crawlResult = await crawler.crawl(project.url);

        // Save pages
        const savedPages = [];
        for (const p of crawlResult.pages) {
          const saved = await prisma.crawlPage.create({
            data: {
              projectId: project.id,
              crawlJobId: crawlJob.id,
              url: p.url,
              path: p.path,
              httpStatus: p.httpStatus,
              isIndexable: p.isIndexable,
              canonicalUrl: p.canonicalUrl,
              title: p.title,
              metaDescription: p.metaDescription,
              h1: p.h1,
              h2Tags: JSON.stringify(p.h2Tags || []),
              h3Tags: JSON.stringify(p.h3Tags || []),
              wordCount: p.wordCount,
              imagesTotal: p.imagesTotal,
              imagesMissingAlt: p.imagesMissingAlt,
              internalLinksCount: p.internalLinksCount,
              externalLinksCount: p.externalLinksCount,
              schemaTypes: JSON.stringify(p.schemaTypes || []),
              hasOpenGraph: p.hasOpenGraph,
              hasTwitterCard: p.hasTwitterCard,
              responseTimeMs: p.responseTimeMs,
            },
          });
          savedPages.push(saved);
        }

        // Run SEO analyzer
        const detectedIssues = analyzeCrawledPages(crawlResult.pages);
        for (const iss of detectedIssues) {
          await prisma.crawlIssue.create({
            data: {
              projectId: project.id,
              crawlJobId: crawlJob.id,
              category: iss.category,
              title: iss.title,
              severity: iss.severity,
              whyItMatters: iss.whyItMatters,
              evidence: iss.evidence,
              solution: iss.solution,
              estimatedImpact: iss.estimatedImpact,
              difficulty: iss.difficulty,
            },
          });
        }

        // Calculate dynamic Optimization Score
        const scoreBreakdown = calculateOptimizationScore(
          crawlResult.pages.map((p) => ({
            url: p.url,
            httpStatus: p.httpStatus,
            isIndexable: p.isIndexable,
            canonicalUrl: p.canonicalUrl,
            title: p.title,
            metaDescription: p.metaDescription,
            h1: p.h1,
            h2Count: p.h2Tags?.length || 0,
            wordCount: p.wordCount,
            imagesTotal: p.imagesTotal,
            imagesMissingAlt: p.imagesMissingAlt,
            internalLinksCount: p.internalLinksCount,
            externalLinksCount: p.externalLinksCount,
            schemaTypes: p.schemaTypes,
            responseTimeMs: p.responseTimeMs,
            hasOpenGraph: p.hasOpenGraph,
            hasTwitterCard: p.hasTwitterCard,
          }))
        );

        // Update Project with score & last crawl time
        await prisma.project.update({
          where: { id: project.id },
          data: {
            crawlStatus: 'COMPLETED',
            lastCrawlAt: new Date(),
            seoScore: scoreBreakdown.overallScore,
            technicalScore: scoreBreakdown.technicalScore,
            contentScore: scoreBreakdown.contentScore,
            indexabilityScore: scoreBreakdown.indexabilityScore,
            performanceScore: scoreBreakdown.performanceScore,
            internalLinkScore: scoreBreakdown.internalLinkScore,
            structuredDataScore: scoreBreakdown.structuredDataScore,
          },
        });

        // Run AI Specialized Agents to generate recommendations
        const aiProposals = [];
        for (const p of crawlResult.pages) {
          const techProposals = await runTechnicalSeoAgent(p);
          const contentProposals = await runContentSeoAgent(p, project.domain);
          aiProposals.push(...techProposals, ...contentProposals);
        }
        const linkProposals = runInternalLinkingAgent(crawlResult.pages);
        aiProposals.push(...linkProposals);

        const discoveredKeywordCount = await discoverSearchKeywords(project.id, crawlResult.pages);
        await prisma.auditLog.create({
          data: {
            projectId: project.id,
            action: 'KEYWORD_DISCOVERY_COMPLETED',
            details: `Discovered ${discoveredKeywordCount} live search suggestions from crawled content. Verified ranking metrics require Search Console or another connected data provider.`,
          },
        });

        // Pass each through QA Agent before persisting
        for (const prop of aiProposals.slice(0, 100)) {
          const qaResult = runQaAgent(prop);
          if (qaResult.isSafe) {
            const affectedPage = savedPages.find((page) => page.url === prop.pageUrl);
            const recommendation = await prisma.seoRecommendation.create({
              data: {
                projectId: project.id,
                pageId: affectedPage?.id,
                agentType: prop.taskType,
                title: prop.title,
                problem: prop.problem,
                searchIntent: prop.searchIntent,
                recommendedAction: prop.recommendedAction,
                suggestedContent: prop.afterValue,
                priority: prop.priority,
                expectedImpact: prop.expectedImpact,
                confidence: prop.confidence,
                status: 'PENDING',
              },
            });

            const canApply = autopilotConfig?.enabled && autopilotConfig.mode === 'AUTONOMOUS';
            const permissionByType = {
              META_TITLE: autopilotConfig?.allowTitleUpdate,
              META_DESCRIPTION: autopilotConfig?.allowMetaDescUpdate,
              SCHEMA: autopilotConfig?.allowSchemaUpdate,
            } as Record<string, boolean | undefined>;
            if (canApply && permissionByType[prop.taskType]) {
              const affectedUrl = affectedPage?.url || prop.pageUrl || project.url;
              await prisma.optimizationChange.create({
                data: {
                  projectId: project.id,
                  pageId: affectedPage?.id,
                  changeType: prop.taskType,
                  originalValue: prop.beforeValue || prop.problem,
                  newValue: prop.afterValue,
                  reason: prop.title,
                  affectedUrl,
                  integrationUsed: 'AUTONOMOUS_ENGINE',
                  status: 'APPLIED',
                },
              });
              await prisma.seoRecommendation.update({
                where: { id: recommendation.id },
                data: { status: 'APPLIED' },
              });
              await prisma.auditLog.create({
                data: {
                  projectId: project.id,
                  action: 'OPTIMIZATION_APPLIED',
                  details: `Autonomously applied ${prop.taskType} to ${affectedUrl}: ${prop.title}`,
                },
              });
            }
          }
        }

        // Autonomous IndexNow & Search Engine Push: Automatically ping Google and Bing
        const isAutonomous = autopilotConfig?.enabled && autopilotConfig.mode === 'AUTONOMOUS';
        if (isAutonomous && crawlResult.pages.length > 0) {
          try {
            const urlsToIndex = crawlResult.pages.map((p) => p.url).slice(0, 100);
            await submitToIndexNow({
              host: project.domain,
              urls: urlsToIndex,
            });

            // If a sitemap URL exists or standard sitemap is available, ping Google & Bing sitemaps
            const cleanOrigin = project.url.replace(/\/+$/, '');
            const candidateSitemap = `${cleanOrigin}/sitemap.xml`;
            await pingSearchEngineSitemaps(candidateSitemap);

            await prisma.auditLog.create({
              data: {
                projectId: project.id,
                action: 'SEARCH_ENGINES_NOTIFIED',
                details: `Dispatched ${urlsToIndex.length} URLs to IndexNow (Bing/Yandex/Seznam) and pinged Google & Bing sitemap crawlers for instant indexing.`,
              },
            });
          } catch (idxErr) {
            console.error('Autonomous IndexNow ping error:', idxErr);
          }
        }

        // Finalize Crawl Job
        await prisma.crawlJob.update({
          where: { id: crawlJob.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            pagesCrawled: crawlResult.pages.length,
            logs: JSON.stringify(crawlResult.logs),
          },
        });
      } catch (err: any) {
        console.error('Crawl execution error:', err);
        await prisma.crawlJob.update({
          where: { id: crawlJob.id },
          data: {
            status: 'FAILED',
            errorMessage: err.message,
            completedAt: new Date(),
          },
        });
        await prisma.project.update({
          where: { id: project.id },
          data: { crawlStatus: 'FAILED' },
        });
      }
    })();

    return NextResponse.json({
      success: true,
      crawlJobId: crawlJob.id,
      message: 'Crawl initiated successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
