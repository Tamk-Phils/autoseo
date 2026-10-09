import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId } })
      : await prisma.project.findFirst({ orderBy: { createdAt: 'desc' } });

    if (!project) {
      return NextResponse.json({ success: true, changes: [], project: null });
    }

    const changes = await prisma.optimizationChange.findMany({
      where: { projectId: project.id },
      orderBy: { appliedAt: 'desc' },
    });

    return NextResponse.json({ success: true, changes, project });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      projectId,
      pageId,
      changeType,
      originalValue,
      newValue,
      reason,
      affectedUrl,
      integrationUsed = 'AUTONOMOUS_ENGINE',
    } = body;

    if (!projectId || !changeType || !newValue || !affectedUrl) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const change = await prisma.optimizationChange.create({
      data: {
        projectId,
        pageId,
        changeType,
        originalValue: originalValue || '',
        newValue,
        reason: reason || 'On-page optimization',
        affectedUrl,
        integrationUsed,
        status: 'APPLIED',
      },
    });

    await prisma.auditLog.create({
      data: {
        projectId,
        action: 'OPTIMIZATION_APPLIED_INSTANTLY',
        details: `Live optimization applied to ${affectedUrl}: ${reason}`,
      },
    });

    return NextResponse.json({ success: true, change });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


