import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const project = projectId
      ? await prisma.project.findFirst({ where: { id: projectId, userId: currentUser.id } })
      : await prisma.project.findFirst({ where: { userId: currentUser.id }, orderBy: { createdAt: 'desc' } });

    if (!project) {
      return NextResponse.json({ success: true, issues: [], project: null });
    }

    const issues = await prisma.crawlIssue.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, issues, project });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

