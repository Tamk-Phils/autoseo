import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUrlForSsrf } from '@/lib/ssrf';
import { ensureDefaultUser } from '@/lib/seed';

export async function GET() {
  try {
    await ensureDefaultUser();
    const projects = await prisma.project.findMany({
      include: {
        _count: {
          select: { pages: true, issues: true, keywords: true, recommendations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, projects });
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

    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { email: 'admin@apexseo.engine', name: 'Site Administrator' },
      });
    }

    const project = await prisma.project.create({
      data: {
        name: name || domain,
        domain,
        url: parsed.origin,
        industry: industry || 'Technology',
        optimizationMode: optimizationMode || 'ASSISTED',
        userId: user.id,
      },
    });

    // Create autopilot config
    await prisma.autopilotConfig.create({
      data: {
        projectId: project.id,
        enabled: optimizationMode === 'AUTONOMOUS',
        mode: optimizationMode || 'ASSISTED',
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

