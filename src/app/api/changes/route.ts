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

