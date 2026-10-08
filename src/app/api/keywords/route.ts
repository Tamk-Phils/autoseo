import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const project = projectId
      ? await prisma.project.findFirst({ where: { id: projectId, userId: currentUser.id } })
      : await prisma.project.findFirst({ where: { userId: currentUser.id }, orderBy: { createdAt: 'desc' } });

    if (!project) {
      return NextResponse.json({ success: true, keywords: [] });
    }

    const keywords = await prisma.keyword.findMany({
      where: { projectId: project.id },
      orderBy: [{ currentPosition: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, keywords, project });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const body = await req.json();
    const { projectId, term, searchIntent = 'Informational', currentPosition = 12.0, searchVolume = 1200 } = body;

    if (!term) {
      return NextResponse.json({ success: false, error: 'Keyword term is required' }, { status: 400 });
    }

    const project = projectId
      ? await prisma.project.findFirst({ where: { id: projectId, userId: currentUser.id } })
      : await prisma.project.findFirst({ where: { userId: currentUser.id }, orderBy: { createdAt: 'desc' } });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const pos = Number(currentPosition);
    const isOpportunity = pos >= 4 && pos <= 20;
    const opportunityNote = isOpportunity
      ? `Almost ranking (Position ${pos.toFixed(1)}). High potential to hit top 3 by optimizing title tag, content topical depth, and internal links.`
      : null;

    const keyword = await prisma.keyword.create({
      data: {
        projectId: project.id,
        term: term.trim(),
        source: 'MANUAL',
        searchIntent,
        currentPosition: pos,
        previousPosition: pos + 1.5,
        bestPosition: pos,
        searchVolume: Number(searchVolume),
        difficulty: 45,
        ctr: 2.1,
        clicks: Math.round(Number(searchVolume) * 0.03),
        impressions: Number(searchVolume),
        rankingUrl: project.url,
        trend: 'UP',
        isOpportunity,
        opportunityNote,
      },
    });

    return NextResponse.json({ success: true, keyword });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

