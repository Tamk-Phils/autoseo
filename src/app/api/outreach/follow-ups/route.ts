import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveTenantContext } from '@/lib/acquisition/tenant';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status')?.trim();

    const where: any = { organizationId: tenant.organization.id };
    if (status && status !== 'ALL') where.status = status;

    const tasks = await prisma.followUpTask.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      take: 150,
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            websiteUrl: true,
            publicEmail: true,
            status: true,
            priority: true,
            isOptedOut: true,
          },
        },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      workspace: tenant.organization,
      tasks,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load follow-ups' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { leadId, title, notes, dueAt } = body;

    if (!leadId || !title) {
      return NextResponse.json({ error: 'leadId and title are required' }, { status: 400 });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: tenant.organization.id },
    });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const parsedDue = dueAt ? new Date(dueAt) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const task = await prisma.followUpTask.create({
      data: {
        organizationId: tenant.organization.id,
        leadId: lead.id,
        assignedUserId: tenant.user.id,
        title: String(title).trim(),
        notes: notes ? String(notes).trim() : null,
        dueAt: parsedDue,
        status: 'PENDING',
      },
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: { nextFollowUpAt: parsedDue },
    });

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create follow-up' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, status } = body;

    if (!taskId || !['PENDING', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'taskId and valid status required' }, { status: 400 });
    }

    const existing = await prisma.followUpTask.findFirst({
      where: { id: taskId, organizationId: tenant.organization.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Follow-up task not found' }, { status: 404 });
    }

    const updated = await prisma.followUpTask.update({
      where: { id: existing.id },
      data: { status },
    });

    return NextResponse.json({ success: true, task: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update follow-up' }, { status: 500 });
  }
}
