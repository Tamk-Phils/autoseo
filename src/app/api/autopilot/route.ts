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
      ? await prisma.project.findFirst({ where: { id: projectId, userId: currentUser.id }, include: { autopilotConfig: true } })
      : await prisma.project.findFirst({ where: { userId: currentUser.id }, include: { autopilotConfig: true } });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    let config = project.autopilotConfig;
    if (!config) {
      config = await prisma.autopilotConfig.create({
        data: {
          projectId: project.id,
          enabled: true,
          mode: 'ASSISTED',
        },
      });
    }

    return NextResponse.json({ success: true, project, config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const body = await req.json();
    const { projectId, config: newConfig } = body;

    let project = projectId
      ? await prisma.project.findFirst({ where: { id: projectId, userId: currentUser.id } })
      : await prisma.project.findFirst({ where: { userId: currentUser.id } });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const updated = await prisma.autopilotConfig.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        enabled: newConfig.enabled ?? newConfig.mode !== 'OFF',
        ...newConfig,
      },
      update: {
        ...newConfig,
        enabled: newConfig.enabled ?? newConfig.mode !== 'OFF',
      },
    });

    if (newConfig.mode) {
      await prisma.project.update({
        where: { id: project.id },
        data: { optimizationMode: newConfig.mode },
      });
    }

    return NextResponse.json({ success: true, config: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

