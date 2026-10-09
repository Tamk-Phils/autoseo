import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ensureAutonomousPageOptimizations } from '@/lib/crawler/runner';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { projectId } = body;

    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId } })
      : await prisma.project.findFirst({ orderBy: { createdAt: 'desc' } });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const result = await ensureAutonomousPageOptimizations(project.id);

    return NextResponse.json({
      success: true,
      message: `Autonomous sweep completed for ${project.domain}`,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

