import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        crawlJobs: { orderBy: { createdAt: 'desc' }, take: 5 },
        pages: { orderBy: { createdAt: 'desc' }, take: 10 },
        optimizationChanges: { orderBy: { appliedAt: 'desc' }, take: 10 },
        integrations: { take: 5 },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const events: any[] = [];

    // 1. Audit Logs (Human-friendly actions)
    for (const log of project.auditLogs) {
      let friendlyTitle = log.action.replace(/_/g, ' ');
      let friendlyCategory = 'SYSTEM';
      let icon = 'Activity';

      if (log.action.includes('SEARCH_ENGINES_PINGED')) {
        friendlyTitle = 'Search Engine Indexing Fast-Track Dispatched';
        friendlyCategory = 'INDEXING';
        icon = 'Zap';
      } else if (log.action.includes('OPTIMIZATION_APPLIED')) {
        friendlyTitle = 'AI On-Page Optimization Applied';
        friendlyCategory = 'OPTIMIZATION';
        icon = 'Sparkles';
      } else if (log.action.includes('PROJECT_INITIALIZED')) {
        friendlyTitle = 'Website Connected to Autonomous Engine';
        friendlyCategory = 'SETUP';
        icon = 'Globe';
      } else if (log.action.includes('INTEGRATION_CONNECTED')) {
        friendlyTitle = 'Publishing Integration Activated';
        friendlyCategory = 'INTEGRATION';
        icon = 'Boxes';
      }

      events.push({
        id: `audit-${log.id}`,
        title: friendlyTitle,
        description: log.details || 'Automated task completed safely.',
        category: friendlyCategory,
        icon,
        timestamp: log.createdAt,
        status: 'COMPLETED',
      });
    }

    // 2. Optimization changes
    for (const change of project.optimizationChanges) {
      events.push({
        id: `change-${change.id}`,
        title: `Optimized ${change.changeType.replace(/_/g, ' ')} for ${change.affectedUrl.replace(/^https?:\/\/[^\/]+/, '') || '/'}`,
        description: `New value: "${change.newValue.length > 70 ? change.newValue.slice(0, 70) + '...' : change.newValue}"`,
        category: 'OPTIMIZATION',
        icon: 'Sparkles',
        timestamp: change.appliedAt,
        status: change.status,
      });
    }

    // 3. Crawl jobs
    for (const job of project.crawlJobs) {
      events.push({
        id: `crawl-${job.id}`,
        title: `Crawled & Analyzed ${job.pagesCrawled} Pages on ${project.domain}`,
        description: `Deep-scanned ${job.pagesCrawled} HTML pages for meta tags, broken links, schema markup, and search crawlability.`,
        category: 'CRAWL',
        icon: 'Search',
        timestamp: job.createdAt,
        status: job.status,
      });
    }

    // 4. Tag / Integration status
    for (const int of project.integrations) {
      if (int.isConnected) {
        events.push({
          id: `int-${int.id}`,
          title: `${int.name} Active & Telemetry Verified`,
          description: `Live connection established with ${project.domain}. Zero-intervention updates active.`,
          category: 'TELEMETRY',
          icon: 'ShieldCheck',
          timestamp: int.lastSyncedAt || int.createdAt,
          status: 'ACTIVE',
        });
      }
    }

    // Sort all events by timestamp descending
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      projectId: project.id,
      domain: project.domain,
      events: events.slice(0, 25),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

