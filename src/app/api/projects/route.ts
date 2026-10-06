import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUrlForSsrf } from '@/lib/ssrf';
import { ensureDefaultUser } from '@/lib/seed';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    let whereClause = {};

    if (currentUser) {
      whereClause = { userId: currentUser.id };
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
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
      return NextResponse.json({ success: false, error: `Security validation blocked URL: ${ssrf.error}` }, { status: 400 });
    }

    const parsed = new URL(url);
    const domain = parsed.hostname;

    const currentUser = await getCurrentUser();
    let targetUserId: string;

    if (currentUser) {
      targetUserId = currentUser.id;
    } else {
      const defaultUser = await ensureDefaultUser();
      targetUserId = defaultUser.id;
    }

    const project = await prisma.project.create({
      data: {
        name: name || domain,
        domain,
        url: parsed.origin,
        industry: industry || 'Technology',
        optimizationMode: optimizationMode || 'AUTONOMOUS',
        userId: targetUserId,
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
        userId: targetUserId,
        action: 'PROJECT_INITIALIZED',
        details: `Connected website: ${domain}`,
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
