import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUrlForSsrf } from '@/lib/ssrf';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId } })
      : await prisma.project.findFirst({ orderBy: { createdAt: 'desc' } });

    if (!project) {
      return NextResponse.json({ success: true, competitors: [], opportunities: [], project: null });
    }

    const competitors = await prisma.competitor.findMany({
      where: { projectId: project.id },
      include: { pages: true },
      orderBy: { createdAt: 'desc' },
    });

    const opportunities = await prisma.contentOpportunity.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, competitors, opportunities, project });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, domain, name } = body;

    if (!domain) {
      return NextResponse.json({ success: false, error: 'Domain is required' }, { status: 400 });
    }

    let cleanDomain = domain.trim();
    if (cleanDomain.startsWith('http://') || cleanDomain.startsWith('https://')) {
      cleanDomain = new URL(cleanDomain).hostname;
    }

    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId } })
      : await prisma.project.findFirst({ orderBy: { createdAt: 'desc' } });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const competitor = await prisma.competitor.create({
      data: {
        projectId: project.id,
        domain: cleanDomain,
        name: name || cleanDomain,
        seoScore: 0,
        searchVisibility: 0,
        commonKeywords: 0,
      },
    });

    return NextResponse.json({ success: true, competitor });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

