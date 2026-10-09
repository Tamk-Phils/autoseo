import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const cookieStore = cookies();
    const cookieId = cookieStore.get('activeProjectId')?.value;
    const targetId = searchParams.get('projectId') || cookieId;

    let project = null;

    if (targetId) {
      if (user) {
        project = await prisma.project.findFirst({
          where: { id: targetId, userId: user.id },
        });
      }
      if (!project) {
        project = await prisma.project.findUnique({
          where: { id: targetId },
        });
      }
    }

    if (!project && user) {
      project = await prisma.project.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!project) {
      project = await prisma.project.findFirst({
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!project) {
      return NextResponse.json({ success: true, project: null });
    }

    const [
      issues,
      recommendations,
      keywords,
      recentChanges,
      pagesCount,
      latestCrawlJob,
      recentAuditLogsCount,
      totalChangesCount,
      criticalIssuesCount,
      highIssuesCount,
    ] = await Promise.all([
      prisma.crawlIssue.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.seoRecommendation.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),
      prisma.keyword.findMany({
        where: { projectId: project.id },
        orderBy: { currentPosition: 'asc' },
        take: 5,
      }),
      prisma.optimizationChange.findMany({
        where: { projectId: project.id },
        orderBy: { appliedAt: 'desc' },
        take: 4,
      }),
      prisma.crawlPage.count({
        where: { projectId: project.id },
      }),
      prisma.crawlJob.findFirst({
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({
        where: { projectId: project.id },
      }),
      prisma.optimizationChange.count({
        where: { projectId: project.id },
      }),
      prisma.crawlIssue.count({
        where: { projectId: project.id, severity: 'CRITICAL' },
      }),
      prisma.crawlIssue.count({
        where: { projectId: project.id, severity: 'HIGH' },
      }),
    ]);

    // Calculate monitoring cycle: period days, days left, and occurrences
    const now = new Date();
    let periodEnd = latestCrawlJob?.periodEnd;
    let periodStart = latestCrawlJob?.periodStart || project.createdAt;

    if (!periodEnd) {
      const fallbackEnd = new Date(periodStart);
      fallbackEnd.setDate(fallbackEnd.getDate() + 14);
      periodEnd = fallbackEnd;
    }

    const msRemaining = Math.max(0, new Date(periodEnd).getTime() - now.getTime());
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    const totalDaysInPeriod = Math.max(
      1,
      Math.round((new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / (1000 * 60 * 60 * 24))
    );
    const daysElapsed = Math.max(0, totalDaysInPeriod - daysRemaining);
    const periodProgressPct = Math.min(100, Math.round((daysElapsed / totalDaysInPeriod) * 100));
    const totalOccurrencesInPeriod = recentAuditLogsCount + pagesCount + totalChangesCount;

    return NextResponse.json({
      success: true,
      project,
      issues,
      recommendations,
      keywords,
      recentChanges,
      pagesCount,
      latestCrawlJob,
      criticalIssuesCount,
      highIssuesCount,
      monitoringCycle: {
        daysRemaining,
        totalDaysInPeriod,
        daysElapsed,
        periodProgressPct,
        totalOccurrencesInPeriod,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

