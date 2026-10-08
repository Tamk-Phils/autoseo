import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUrlForSsrf } from '@/lib/ssrf';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { userId: currentUser.id },
      include: {
        _count: {
          select: { pages: true, issues: true, keywords: true, recommendations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, projects, user: currentUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, name, industry, optimizationMode } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: 'Website URL is required' }, { status: 400 });
    }

    // SSRF Check
    const ssrf = await validateUrlForSsrf(url);
    if (!ssrf.valid) {
      return NextResponse.json({ success: false, error: ssrf.error }, { status: 400 });
    }

    const parsed = new URL(url);
    const domain = parsed.hostname;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const project = await prisma.project.create({
      data: {
        name: name || domain,
        domain,
        url: parsed.origin,
        industry: industry || 'Technology',
        optimizationMode: optimizationMode || 'AUTONOMOUS',
        userId: currentUser.id,
      },
    });

    // Create autopilot config
    await prisma.autopilotConfig.create({
      data: {
        projectId: project.id,
        enabled: true,
        mode: optimizationMode || 'AUTONOMOUS',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        projectId: project.id,
        userId: currentUser.id,
        action: 'PROJECT_INITIALIZED',
        details: `Connected website: ${domain}`,
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, maxPages, crawlDepth, userAgent, country, languages } = body;
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }

    const project = await prisma.project.findFirst({ where: { id: projectId, userId: currentUser.id } });
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        crawlMaxPages: Math.min(500, Math.max(1, Number(maxPages) || project.crawlMaxPages)),
        crawlMaxDepth: Math.min(10, Math.max(1, Number(crawlDepth) || project.crawlMaxDepth)),
        crawlerUserAgent: typeof userAgent === 'string' && userAgent.trim() ? userAgent.trim() : project.crawlerUserAgent,
        country: typeof country === 'string' ? country : project.country,
        targetLanguages: typeof languages === 'string' ? languages : project.targetLanguages,
      },
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
