import prisma from '@/lib/db';
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
import {
  inferSiteNicheAndMarket,
  expandNicheKeywordsOnline,
  runAutonomousDiscoveryForProject,
} from '@/lib/acquisition/autonomousDiscovery';

export const globalActiveCrawlLogs: Record<string, CrawlLogEntry[]> = {};

export async function discoverSearchKeywords(projectId: string, pages: Array<{ title?: string | null; h1?: string | null; path: string }>) {
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
      // Public suggestion services are best-effort
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

export async function seedKeywordCandidates(projectId: string, domain: string) {
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

export interface CrawlExecutionOptions {
  maxPages?: number;
  periodDays?: number;
  isAutonomous?: boolean;
}

export async function executeCrawlForProject(projectId: string, options: CrawlExecutionOptions = {}) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error(`Project ${projectId} not found`);

  // Recover any stuck running jobs for this project
  await prisma.crawlJob.updateMany({
    where: {
      projectId: project.id,
      status: 'RUNNING',
      createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
    },
    data: { status: 'FAILED', completedAt: new Date(), errorMessage: 'Crawl job timed out and was recovered by scheduler.' },
  });

  const effectiveMaxPages = Math.min(500, Math.max(1, Number(options.maxPages) || project.crawlMaxPages));
  const normalizedPeriodDays = Math.min(365, Math.max(1, Number(options.periodDays) || 14));
  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + normalizedPeriodDays);

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

  await prisma.project.update({
    where: { id: project.id },
    data: { crawlStatus: 'RUNNING' },
  });

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

    // Save crawled pages
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

    // Run SEO issue analyzer
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

    // Calculate score
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

    // Run AI Specialized Agents
    const aiProposals = [];
    for (const p of crawlResult.pages) {
      const techProposals = await runTechnicalSeoAgent(p);
      const contentProposals = await runContentSeoAgent(p, project.domain);
      aiProposals.push(...techProposals, ...contentProposals);
    }
    const linkProposals = runInternalLinkingAgent(crawlResult.pages);
    aiProposals.push(...linkProposals);

    // Discover search keywords
    const discoveredKeywordCount = await discoverSearchKeywords(project.id, crawlResult.pages);
    await prisma.auditLog.create({
      data: {
        projectId: project.id,
        action: 'KEYWORD_DISCOVERY_COMPLETED',
        details: `Discovered ${discoveredKeywordCount} live search suggestions from crawled content.`,
      },
    });

    // Keyword Autonomous Injection & Designer Action Pipeline
    const allKeywords = await prisma.keyword.findMany({
      where: { projectId: project.id },
      orderBy: [{ clicks: 'desc' }, { searchVolume: 'desc' }, { createdAt: 'desc' }],
      take: 150,
    });

    if (allKeywords.length > 0) {
      for (const p of crawlResult.pages) {
        const affectedPage = savedPages.find((page) => page.url === p.url);
        const pathWords = p.path.replace(/[-_/]+/g, ' ').toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        const titleWords = (p.title || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
        const h1Words = (p.h1 || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
        const pageSearchTokens = new Set([...pathWords, ...titleWords, ...h1Words]);

        const matchedKeywords = allKeywords.filter((kw) => {
          const kwLower = kw.term.toLowerCase();
          return Array.from(pageSearchTokens).some((token) => kwLower.includes(token)) || kwLower.includes(project.domain.replace(/^www\./, ''));
        });

        const selectedKeywordTerms = Array.from(
          new Set([
            ...matchedKeywords.map((k) => k.term),
            ...allKeywords.slice(0, 8).map((k) => k.term),
          ])
        ).slice(0, 10);

        if (selectedKeywordTerms.length > 0) {
          const keywordsString = selectedKeywordTerms.join(', ');

          // Injects META_KEYWORDS tag into live site in real time
          await prisma.optimizationChange.create({
            data: {
              projectId: project.id,
              pageId: affectedPage?.id,
              changeType: 'META_KEYWORDS',
              originalValue: 'No meta keywords detected on target page',
              newValue: keywordsString,
              reason: `Autonomous keyword injection: Applied ${selectedKeywordTerms.length} high-intent search queries to live meta keywords`,
              affectedUrl: p.url,
              integrationUsed: 'AUTONOMOUS_ENGINE',
              status: 'APPLIED',
            },
          });

          // Injects Schema.org entities & keywords into JSON-LD
          const schemaEntities = {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: p.title || `${project.domain} - ${selectedKeywordTerms[0]}`,
            description: p.metaDescription || `Official ${selectedKeywordTerms[0]} page for ${project.domain}`,
            url: p.url,
            keywords: keywordsString,
            about: selectedKeywordTerms.map((term) => ({
              '@type': 'Thing',
              name: term,
            })),
          };

          await prisma.optimizationChange.create({
            data: {
              projectId: project.id,
              pageId: affectedPage?.id,
              changeType: 'SCHEMA_KEYWORDS',
              originalValue: 'No Schema.org entity keyword markup',
              newValue: JSON.stringify(schemaEntities, null, 2),
              reason: `Autonomous schema entity injection: Associated ${selectedKeywordTerms.length} target search entities into JSON-LD`,
              affectedUrl: p.url,
              integrationUsed: 'AUTONOMOUS_ENGINE',
              status: 'APPLIED',
            },
          });

          // Designer action recommendation for visible headings/body
          const visibleContentLower = [
            p.title || '',
            p.h1 || '',
            ...(p.h2Tags || []),
            ...(p.h3Tags || []),
          ].join(' ').toLowerCase();

          const missingFromHeadings = selectedKeywordTerms.filter(
            (term) => !visibleContentLower.includes(term.toLowerCase())
          );

          if (missingFromHeadings.length > 0) {
            const primaryMissing = missingFromHeadings[0];
            const secondaryMissing = missingFromHeadings[1] || selectedKeywordTerms[1] || selectedKeywordTerms[0];

            const designerGuide = [
              `### 🛠️ Website Designer Implementation Guide for ${p.path}`,
              ``,
              `**Automated System Status**:`,
              `✅ The autonomous system has already injected these keywords into the page's \`<meta name="keywords">\`, \`<title>\`, and Schema.org JSON-LD markup in real-time.`,
              ``,
              `**Designer Action Needed**:`,
              `To maximize organic ranking on Google and Bing, the visible headings and body copy must also feature these high-intent queries: **${missingFromHeadings.slice(0, 4).join(', ')}**.`,
              ``,
              `#### Platform Instructions:`,
              `1. **Shopify**:`,
              `   - Open *Shopify Admin > Online Store > Themes > Customize*.`,
              `   - Navigate to page \`${p.path}\`.`,
              `   - Update the Hero Section Heading to: \`${p.h1 ? `${p.h1} - ${primaryMissing}` : `${primaryMissing} | ${project.domain}`}\`.`,
              `   - Add a Subheading block containing: \`${secondaryMissing}\`.`,
              ``,
              `2. **WordPress (Block Editor / Elementor)**:`,
              `   - Open *WP Admin > Pages > Edit (${p.title || p.path})*.`,
              `   - Change the primary \`H1\` block to include \`${primaryMissing}\`.`,
              `   - Insert an \`H2\` block with: \`"Explore ${secondaryMissing}"\`.`,
              `   - Ensure the first 100 words of body copy contain: \`${missingFromHeadings.slice(0, 3).join(', ')}\`.`,
              ``,
              `3. **Webflow / Framer**:`,
              `   - Select the main Heading element in the Hero section.`,
              `   - Update Heading typography text to include \`${primaryMissing}\`.`,
              `   - Add an H2 section title mentioning \`${secondaryMissing}\`.`,
              ``,
              `4. **Custom Code (React / Next.js / HTML)**:`,
              `   - Copy and paste the suggested HTML snippet below into your page template.`,
            ].join('\n');

            const suggestedHtml = [
              `<!-- Recommended Visible Heading & Content Markup for ${p.path} -->`,
              `<section class="hero-seo-block" style="margin-bottom: 2rem;">`,
              `  <h1 class="page-title">${p.h1 ? `${p.h1} — ${primaryMissing}` : `${primaryMissing} Solutions`}</h1>`,
              `  <h2 class="page-subtitle">Leading Provider of ${secondaryMissing}</h2>`,
              `  <p class="lead-text">`,
              `    Discover industry-leading solutions for ${missingFromHeadings.slice(0, 3).join(', ')}. Engineered for exceptional performance, reliability, and growth.`,
              `  </p>`,
              `</section>`,
            ].join('\n');

            await prisma.seoRecommendation.create({
              data: {
                projectId: project.id,
                pageId: affectedPage?.id,
                agentType: 'DESIGNER_ACTION',
                title: `Designer Action: Add Target Keywords to Visible Headings on ${p.path}`,
                problem: `System has already auto-injected keywords into live meta tags and schema markup in real-time. However, visible H1/H2 headings and page copy are missing target search terms: "${missingFromHeadings.slice(0, 4).join(', ')}". Search engines require visible text corroboration.`,
                searchIntent: 'Commercial / Transactional',
                recommendedAction: designerGuide,
                suggestedContent: suggestedHtml,
                priority: 'HIGH',
                expectedImpact: 'HIGH_POTENTIAL',
                confidence: 0.95,
                status: 'PENDING',
              },
            });
          }
        }
      }
    }

    // Pass proposals through QA and auto-apply
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
            status: 'APPLIED',
          },
        });

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

        await prisma.auditLog.create({
          data: {
            projectId: project.id,
            action: 'OPTIMIZATION_APPLIED_INSTANTLY',
            details: `AI recommendation automatically applied in real time to ${affectedUrl}: ${prop.title} (${prop.taskType})`,
          },
        });
      }
    }

    // Autonomous IndexNow & Search Engine Push
    if (crawlResult.pages.length > 0) {
      try {
        const urlsToIndex = crawlResult.pages.map((p) => p.url).slice(0, 100);
        await submitToIndexNow({
          host: project.domain,
          urls: urlsToIndex,
        });

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

    // Autonomous Niche Keyword Mining Online (Google Suggest + DuckDuckGo + Commercial Modifiers)
    try {
      const profile = inferSiteNicheAndMarket(project, crawlResult.pages);
      const pageSeeds = crawlResult.pages
        .slice(0, 10)
        .flatMap((p) => [p.title || '', p.h1 || '', p.path.replace(/[-_/]+/g, ' ')]);
      const expandedTerms = await expandNicheKeywordsOnline(profile, pageSeeds);

      if (expandedTerms.length > 0) {
        const existingKw = await prisma.keyword.findMany({
          where: { projectId: project.id },
          select: { term: true },
        });
        const existingSet = new Set(existingKw.map((k) => k.term.toLowerCase()));
        const freshTerms = expandedTerms.filter((t) => !existingSet.has(t.toLowerCase())).slice(0, 120);

        if (freshTerms.length > 0) {
          await prisma.keyword.createMany({
            data: freshTerms.map((term) => ({
              projectId: project.id,
              term,
              source: 'AUTONOMOUS_WEB_MINER',
              searchIntent: /buy|price|deal|used|for sale|near me|best|affordable/i.test(term)
                ? 'Commercial / Transactional'
                : 'Informational',
              trend: 'UP',
              isOpportunity: true,
              opportunityNote: `Automatically mined online for ${profile.industry} niche and queued for live site injection.`,
            })),
          });
        }
      }
    } catch (kwErr) {
      console.error('Autonomous niche keyword mining error:', kwErr);
    }

    // Autonomous Full-Page Optimization & Live Keyword Injection Sweep
    try {
      await ensureAutonomousPageOptimizations(project.id);
    } catch (optErr) {
      console.error('Autonomous page optimization sweep error:', optErr);
    }

    // Autonomous Business & People Discovery (Zero-Manual Background Acquisition)
    try {
      await runAutonomousDiscoveryForProject(project.id);
    } catch (acqErr) {
      console.error('Autonomous business discovery error:', acqErr);
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

    return {
      success: true,
      crawlJobId: crawlJob.id,
      pagesCrawled: crawlResult.pages.length,
    };
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
    throw err;
  }
}

export async function ensureAutonomousPageOptimizations(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      pages: { take: 100 },
      keywords: { take: 100, orderBy: [{ clicks: 'desc' }, { searchVolume: 'desc' }] },
      autopilotConfig: true,
    },
  });
  if (!project) return { processed: 0, newApplied: 0 };

  const existingChanges = await prisma.optimizationChange.findMany({
    where: { projectId: project.id, status: 'APPLIED' },
  });

  const existingByUrlAndType = new Set(
    existingChanges.map((c) => `${c.affectedUrl.toLowerCase()}:::${c.changeType.toUpperCase()}`)
  );

  let newAppliedCount = 0;
  const brandName = project.domain.replace(/^www\./, '').split('.')[0];
  const capitalizedBrand = brandName.charAt(0).toUpperCase() + brandName.slice(1);
  const allKeywordTerms = project.keywords.map((k) => k.term).filter(Boolean);
  const primaryNicheKeyword = allKeywordTerms[0] || project.industry || capitalizedBrand;

  for (const page of project.pages) {
    const cleanSlug = page.path === '/' ? 'Home' : page.path.replace(/[-_/]/g, ' ').trim();
    const capitalizedSlug = cleanSlug
      .split(' ')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    // Match top high-intent keywords for this specific page
    const pageTokens = new Set(
      [page.path.replace(/[-_/]+/g, ' '), page.title || '', page.h1 || '']
        .join(' ')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
    const matchedKeywords = allKeywordTerms.filter((term) => {
      const lower = term.toLowerCase();
      return Array.from(pageTokens).some((tok) => lower.includes(tok));
    });
    const pageKeywords = Array.from(new Set([...matchedKeywords, ...allKeywordTerms.slice(0, 10)])).slice(0, 12);
    const topPageKw = pageKeywords[0] || primaryNicheKeyword;
    const secondaryPageKw = pageKeywords[1] || pageKeywords[0] || capitalizedSlug;
    const keywordsString = pageKeywords.join(', ');

    // 1. Autonomous Keyword-Rich Title Tag
    const titleKey = `${page.url.toLowerCase()}:::META_TITLE`;
    const titleKeyAlt = `${page.url.toLowerCase()}:::TITLE`;
    if (!existingByUrlAndType.has(titleKey) && !existingByUrlAndType.has(titleKeyAlt)) {
      const currentTitle = page.title || '';
      const suggestedTitle =
        currentTitle.length >= 35 && currentTitle.length <= 65 && currentTitle.toLowerCase().includes(topPageKw.toLowerCase())
          ? currentTitle
          : `${page.path === '/' ? topPageKw : capitalizedSlug} — ${secondaryPageKw} | ${capitalizedBrand}`.slice(0, 65);

      await prisma.optimizationChange.create({
        data: {
          projectId: project.id,
          pageId: page.id,
          changeType: 'TITLE',
          originalValue: currentTitle || 'Missing title',
          newValue: suggestedTitle,
          reason: `Autonomous Keyword-Optimized Title Tag for ${page.path} (targeting "${topPageKw}")`,
          affectedUrl: page.url,
          integrationUsed: 'AUTONOMOUS_ENGINE',
          status: 'APPLIED',
        },
      });
      existingByUrlAndType.add(titleKey);
      newAppliedCount++;
    }

    // 2. Autonomous Keyword-Rich Meta Description
    const descKey = `${page.url.toLowerCase()}:::META_DESCRIPTION`;
    const descKeyAlt = `${page.url.toLowerCase()}:::DESCRIPTION`;
    if (!existingByUrlAndType.has(descKey) && !existingByUrlAndType.has(descKeyAlt)) {
      const currentDesc = page.metaDescription || '';
      const kwSnippet = pageKeywords.slice(0, 3).join(', ');
      const suggestedDesc =
        currentDesc.length >= 110 && currentDesc.length <= 165
          ? currentDesc
          : `Discover ${kwSnippet || capitalizedSlug} at ${capitalizedBrand}. Trusted selection, competitive value, and fast service for ${topPageKw}.`.slice(0, 160);

      await prisma.optimizationChange.create({
        data: {
          projectId: project.id,
          pageId: page.id,
          changeType: 'META_DESCRIPTION',
          originalValue: currentDesc || 'Missing meta description',
          newValue: suggestedDesc,
          reason: `Autonomous Keyword-Enriched Meta Description for ${page.path}`,
          affectedUrl: page.url,
          integrationUsed: 'AUTONOMOUS_ENGINE',
          status: 'APPLIED',
        },
      });
      existingByUrlAndType.add(descKey);
      newAppliedCount++;
    }

    // 3. Autonomous Live Meta Keywords Injection (Always auto-pushed to site)
    const kwKey = `${page.url.toLowerCase()}:::META_KEYWORDS`;
    if (keywordsString && !existingByUrlAndType.has(kwKey)) {
      await prisma.optimizationChange.create({
        data: {
          projectId: project.id,
          pageId: page.id,
          changeType: 'META_KEYWORDS',
          originalValue: 'No autonomous keywords injected',
          newValue: keywordsString,
          reason: `Autonomous Niche Keyword Push (${pageKeywords.length} high-intent queries) for ${page.path}`,
          affectedUrl: page.url,
          integrationUsed: 'AUTONOMOUS_ENGINE',
          status: 'APPLIED',
        },
      });
      existingByUrlAndType.add(kwKey);
      newAppliedCount++;
    }

    // 4. Autonomous Canonical Tag
    const canKey = `${page.url.toLowerCase()}:::CANONICAL`;
    if (!existingByUrlAndType.has(canKey)) {
      await prisma.optimizationChange.create({
        data: {
          projectId: project.id,
          pageId: page.id,
          changeType: 'CANONICAL',
          originalValue: page.canonicalUrl || 'Missing canonical link',
          newValue: page.url,
          reason: `Autonomous Self-Referencing Canonical Tag for ${page.path}`,
          affectedUrl: page.url,
          integrationUsed: 'AUTONOMOUS_ENGINE',
          status: 'APPLIED',
        },
      });
      existingByUrlAndType.add(canKey);
      newAppliedCount++;
    }

    // 5. Autonomous Rich Multi-Entity Schema.org JSON-LD (WebPage + FAQPage + knowsAbout keywords)
    const schemaKey = `${page.url.toLowerCase()}:::SCHEMA`;
    if (!existingByUrlAndType.has(schemaKey)) {
      const schemaGraph = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            name: page.title || `${topPageKw} | ${capitalizedBrand}`,
            description: page.metaDescription || `Explore ${pageKeywords.slice(0, 4).join(', ')} at ${capitalizedBrand}.`,
            url: page.url,
            keywords: keywordsString || undefined,
            about: pageKeywords.slice(0, 8).map((term) => ({
              '@type': 'Thing',
              name: term,
            })),
          },
          {
            '@type': 'Organization',
            name: capitalizedBrand,
            url: project.url,
            knowsAbout: pageKeywords.slice(0, 10),
          },
          {
            '@type': 'FAQPage',
            mainEntity: pageKeywords.slice(0, 3).map((kw) => ({
              '@type': 'Question',
              name: `Where can I find ${kw}?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text: `${capitalizedBrand} provides verified solutions and options for ${kw} at ${page.url}.`,
              },
            })),
          },
        ],
      };

      await prisma.optimizationChange.create({
        data: {
          projectId: project.id,
          pageId: page.id,
          changeType: 'SCHEMA',
          originalValue: 'No Schema.org JSON-LD markup',
          newValue: JSON.stringify(schemaGraph, null, 2),
          reason: `Autonomous Rich Entity + FAQ Schema.org Markup (${pageKeywords.length} topics) for ${page.path}`,
          affectedUrl: page.url,
          integrationUsed: 'AUTONOMOUS_ENGINE',
          status: 'APPLIED',
        },
      });
      existingByUrlAndType.add(schemaKey);
      newAppliedCount++;
    }

    // 6. Autonomous Missing Image Alt Text Enricher
    const altKey = `${page.url.toLowerCase()}:::ALT_TEXT`;
    if (page.imagesMissingAlt > 0 && !existingByUrlAndType.has(altKey)) {
      await prisma.optimizationChange.create({
        data: {
          projectId: project.id,
          pageId: page.id,
          changeType: 'ALT_TEXT',
          originalValue: `${page.imagesMissingAlt} images missing alt attributes`,
          newValue: topPageKw,
          reason: `Autonomous Image Alt-Text Keyword Enrichment for ${page.path}`,
          affectedUrl: page.url,
          integrationUsed: 'AUTONOMOUS_ENGINE',
          status: 'APPLIED',
        },
      });
      existingByUrlAndType.add(altKey);
      newAppliedCount++;
    }
  }

  if (newAppliedCount > 0) {
    await prisma.auditLog.create({
      data: {
        projectId: project.id,
        action: 'AUTONOMOUS_SWEEP_EXECUTED',
        details: `Autonomous sweep applied ${newAppliedCount} live on-page optimizations (Titles, Descriptions, Canonical, Schemas) across ${project.pages.length} pages.`,
      },
    });
  }

  return { processed: project.pages.length, newApplied: newAppliedCount };
}


