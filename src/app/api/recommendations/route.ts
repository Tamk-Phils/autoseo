import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId } })
      : await prisma.project.findFirst();

    if (!project) {
      return NextResponse.json({ success: true, recommendations: [] });
    }

    const recommendations = await prisma.seoRecommendation.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, recommendations, project });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, action } = body; // action: 'APPROVE' or 'REJECT'

    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'id and action required' }, { status: 400 });
    }

    const rec = await prisma.seoRecommendation.findUnique({ where: { id } });
    if (!rec) {
      return NextResponse.json({ success: false, error: 'Recommendation not found' }, { status: 404 });
    }

    const updated = await prisma.seoRecommendation.update({
      where: { id },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      },
    });

    return NextResponse.json({ success: true, recommendation: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

