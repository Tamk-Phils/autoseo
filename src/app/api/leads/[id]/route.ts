import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveTenantContext } from '@/lib/acquisition/tenant';
import { cleanWebsiteUrl, normalizeDomain } from '@/lib/acquisition/discovery';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = new Set([
  'DISCOVERED',
  'ANALYSED',
  'QUALIFIED',
  'CONTACT_APPROVED',
  'CONTACTED',
  'INTERESTED',
  'CONVERTED',
  'REJECTED',
  'DISQUALIFIED',
  'LOST',
  'UNSUBSCRIBED',
]);

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: tenant.organization.id },
      include: {
        campaign: true,
        assignedUser: { select: { id: true, name: true, email: true } },
        audits: { orderBy: { createdAt: 'desc' }, take: 5 },
        scores: { orderBy: { createdAt: 'desc' }, take: 5 },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true, email: true } } },
        },
        outreachMessages: { orderBy: { createdAt: 'desc' } },
        followUpTasks: { orderBy: { dueAt: 'asc' } },
        conversions: { orderBy: { convertedAt: 'desc' } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, workspace: tenant.organization, lead });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load lead' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const existing = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: tenant.organization.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.status && VALID_STATUSES.has(body.status)) {
      updateData.status = body.status;
      if (body.status === 'UNSUBSCRIBED') {
        updateData.isOptedOut = true;
        // Automatically add to suppression list
        const idToSuppress = existing.publicEmail?.toLowerCase() || existing.normalizedDomain;
        if (idToSuppress) {
          await prisma.suppressionEntry.upsert({
            where: {
              organizationId_identifier: {
                organizationId: tenant.organization.id,
                identifier: idToSuppress,
              },
            },
            update: { reason: 'UNSUBSCRIBE' },
            create: {
              organizationId: tenant.organization.id,
              identifier: idToSuppress,
              reason: 'UNSUBSCRIBE',
              source: `lead:${existing.id}`,
            },
          });
        }
      }
    }

    if (typeof body.publicEmail === 'string') {
      updateData.publicEmail = body.publicEmail.trim() || null;
      if (updateData.publicEmail && !existing.contactSource) {
        updateData.contactSource = 'MANUAL_UPDATE';
      }
    }
    if (typeof body.publicPhone === 'string') {
      updateData.publicPhone = body.publicPhone.trim() || null;
    }
    if (typeof body.websiteUrl === 'string') {
      const cleaned = cleanWebsiteUrl(body.websiteUrl);
      updateData.websiteUrl = cleaned;
      updateData.normalizedDomain = normalizeDomain(cleaned);
      updateData.websiteStatus = 'UNVERIFIED';
    }
    if (body.nextFollowUpAt) {
      updateData.nextFollowUpAt = new Date(body.nextFollowUpAt);
    }

    // Optional new note creation
    if (typeof body.note === 'string' && body.note.trim().length > 0) {
      await prisma.leadNote.create({
        data: {
          organizationId: tenant.organization.id,
          leadId: existing.id,
          authorId: tenant.user.id,
          content: body.note.trim(),
        },
      });
    }

    const updated = await prisma.lead.update({
      where: { id: existing.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const existing = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: tenant.organization.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    await prisma.lead.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true, deletedId: existing.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete lead' }, { status: 500 });
  }
}
