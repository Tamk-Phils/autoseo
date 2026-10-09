import prisma from '@/lib/db';
import { executeCrawlForProject } from '@/lib/crawler/runner';

let isPulseRunning = false;
let schedulerTimer: NodeJS.Timeout | null = null;

export async function runAutonomousCrawlPulse() {
  if (isPulseRunning) {
    return { skipped: true, reason: 'Pulse already in progress' };
  }

  isPulseRunning = true;
  const processedProjects: string[] = [];

  try {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    // 1. Recover any zombie running crawl jobs
    await prisma.crawlJob.updateMany({
      where: {
        status: 'RUNNING',
        createdAt: { lt: threeMinutesAgo },
      },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: 'Crawl recovered automatically by autonomous scheduler.',
      },
    });

    // 2. Recover any projects stuck in RUNNING status without active recent jobs
    const runningProjects = await prisma.project.findMany({
      where: { crawlStatus: 'RUNNING' },
      include: {
        crawlJobs: {
          where: { status: 'RUNNING', createdAt: { gte: threeMinutesAgo } },
        },
      },
    });

    for (const p of runningProjects) {
      if (p.crawlJobs.length === 0) {
        await prisma.project.update({
          where: { id: p.id },
          data: { crawlStatus: 'IDLE' },
        });
      }
    }

    // 3. Find projects eligible for their 1-minute crawl pulse
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const eligibleProjects = await prisma.project.findMany({
      where: {
        crawlStatus: { not: 'RUNNING' },
        OR: [
          { lastCrawlAt: null },
          { lastCrawlAt: { lt: oneMinuteAgo } },
        ],
      },
      orderBy: { lastCrawlAt: 'asc' }, // Prioritize projects that haven't crawled in the longest time
      take: 5, // Process up to 5 projects per pulse to maintain high throughput
    });

    for (const project of eligibleProjects) {
      try {
        await executeCrawlForProject(project.id, {
          isAutonomous: true,
          maxPages: Math.min(20, project.crawlMaxPages || 20),
        });

        await prisma.auditLog.create({
          data: {
            projectId: project.id,
            action: 'AUTONOMOUS_PULSE_EXECUTED',
            details: `1-minute autonomous interval crawl completed for ${project.domain}. URLs dispatched to IndexNow (Bing/Google) and keywords refreshed.`,
          },
        });

        processedProjects.push(project.domain);
      } catch (err: any) {
        console.error(`Autonomous crawl pulse error for ${project.domain}:`, err.message);
      }
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      projectsProcessed: processedProjects,
    };
  } finally {
    isPulseRunning = false;
  }
}

export function initAutonomousScheduler() {
  if (schedulerTimer) return;

  // Run initial pulse after 5 seconds of server startup
  setTimeout(() => {
    runAutonomousCrawlPulse().catch((err) => console.error('Initial crawl pulse error:', err));
  }, 5000);

  // Then tick continuously every 60 seconds (1 minute)
  schedulerTimer = setInterval(() => {
    runAutonomousCrawlPulse().catch((err) => console.error('Recurring crawl pulse error:', err));
  }, 60 * 1000);

  if (schedulerTimer.unref) {
    schedulerTimer.unref();
  }

  console.log('[AutonomousScheduler] 1-minute autonomous crawl loop initialized.');
}
