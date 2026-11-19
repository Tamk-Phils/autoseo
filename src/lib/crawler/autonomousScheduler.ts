import prisma from '@/lib/db';
import { executeCrawlForProject } from '@/lib/crawler/runner';

type SchedulerGlobal = typeof globalThis & {
  __apexSeoPulseRunning?: boolean;
  __apexSeoPulseStartedAt?: number;
  __apexSeoSchedulerTimer?: NodeJS.Timeout | null;
  __apexSeoLastPulseAt?: string | null;
};

const g = globalThis as SchedulerGlobal;

export async function runAutonomousCrawlPulse() {
  // Safety valve: if a previous pulse has been stuck for > 5 minutes, release the lock
  if (g.__apexSeoPulseRunning && g.__apexSeoPulseStartedAt) {
    if (Date.now() - g.__apexSeoPulseStartedAt > 5 * 60 * 1000) {
      g.__apexSeoPulseRunning = false;
    }
  }

  if (g.__apexSeoPulseRunning) {
    return { skipped: true, reason: 'Pulse already in progress' };
  }

  g.__apexSeoPulseRunning = true;
  g.__apexSeoPulseStartedAt = Date.now();
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

    g.__apexSeoLastPulseAt = new Date().toISOString();

    return {
      success: true,
      timestamp: g.__apexSeoLastPulseAt,
      projectsProcessed: processedProjects,
      serverSchedulerActive: Boolean(g.__apexSeoSchedulerTimer),
    };
  } finally {
    g.__apexSeoPulseRunning = false;
  }
}

export function initAutonomousScheduler() {
  if (g.__apexSeoSchedulerTimer) return;

  // Run initial pulse after 5 seconds of server startup
  const bootTimer = setTimeout(() => {
    runAutonomousCrawlPulse().catch((err) => console.error('Initial crawl pulse error:', err));
  }, 5000);
  if (bootTimer.unref) bootTimer.unref();

  // Then tick continuously every 60 seconds (1 minute) on the server, even with 0 browsers open
  g.__apexSeoSchedulerTimer = setInterval(() => {
    runAutonomousCrawlPulse().catch((err) => console.error('Recurring crawl pulse error:', err));
  }, 60 * 1000);

  if (g.__apexSeoSchedulerTimer.unref) {
    g.__apexSeoSchedulerTimer.unref();
  }

  console.log('[AutonomousScheduler] 1-minute server-side autonomous crawl loop initialized.');
}

