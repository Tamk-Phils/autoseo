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

// In-memory progress tracker for live streaming console
export const globalActiveCrawlLogs: Record<string, CrawlLogEntry[]> = {};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, maxPages = 20, periodDays = 14 } = body;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    let project = projectId
      ? await prisma.project.findFirst({ where: { id: projectId, userId: currentUser.id } })
      : await prisma.project.findFirst({ where: { userId: currentUser.id }, orderBy: { createdAt: 'desc' } });

    if (!project) {
      return NextResponse.json({ success: false, error: 'No project found to crawl' }, { status: 404 });
    }

    const autopilotConfig = await prisma.autopilotConfig.findUnique({ where: { projectId: project.id } });
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
