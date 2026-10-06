import { NextResponse } from 'next/server';
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

// In-memory progress tracker for live streaming console
export const globalActiveCrawlLogs: Record<string, CrawlLogEntry[]> = {};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { projectId, maxPages = 20 } = body;

    let project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId } })
      : await prisma.project.findFirst();

    if (!project) {
      return NextResponse.json({ success: false, error: 'No project found to crawl' }, { status: 404 });
    }

    // Create Crawl Job
    const crawlJob = await prisma.crawlJob.create({
      data: {
        projectId: project.id,
        status: 'RUNNING',
        startedAt: new Date(),
        maxPages: Number(maxPages),
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
          maxPages: Number(maxPages),
          maxDepth: 3,
          onProgress: (log) => {
            if (!globalActiveCrawlLogs[crawlJob.id]) {
              globalActiveCrawlLogs[crawlJob.id] = [];
            }
            globalActiveCrawlLogs[crawlJob.id].push(log);
          },
        });

        const crawlResult = await crawler.crawl(project.url);

        // Clear previous pages and issues for fresh crawl
        await prisma.crawlPage.deleteMany({ where: { projectId: project.id } });
        await prisma.crawlIssue.deleteMany({ where: { projectId: project.id } });

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
        for (const prop of aiProposals.slice(0, 10)) {
          const qaResult = runQaAgent(prop);
          if (qaResult.isSafe) {
            await prisma.seoRecommendation.create({
              data: {
                projectId: project.id,
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
