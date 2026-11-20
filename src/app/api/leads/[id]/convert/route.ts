import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveTenantContext } from '@/lib/acquisition/tenant';
import { normalizeDomain } from '@/lib/acquisition/discovery';

export const dynamic = 'force-dynamic';

/**
 * The AutoSEO Growth Loop:
 * Converts a qualified lead into a paying customer / AutoSEO subscription
 * AND optionally launches an active autonomous SEO Project for their website.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: tenant.organization.id },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const revenueAmount = typeof body.revenueAmount === 'number' ? Math.max(0, body.revenueAmount) : 0;
    const currency = typeof body.currency === 'string' ? body.currency.toUpperCase().slice(0, 6) : 'USD';
    const launchSeoProject = body.launchSeoProject !== false;

    let createdProject = null;

    if (launchSeoProject && lead.websiteUrl) {
      const domain = normalizeDomain(lead.websiteUrl) || lead.websiteUrl;
      createdProject = await prisma.project.create({
        data: {
          name: lead.businessName,
          domain,
          url: lead.websiteUrl,
          industry: lead.industry || 'General',
          country: lead.country || 'US',
          optimizationMode: 'AUTONOMOUS',
          seoScore: lead.seoScore || 0,
          userId: tenant.user.id,
          organizationId: tenant.organization.id,
          autopilotConfig: {
            create: {
              enabled: true,
              mode: 'AUTONOMOUS',
            },
          },
        },
      });
    }

    const conversion = await prisma.conversionEvent.create({
      data: {
        organizationId: tenant.organization.id,
        leadId: lead.id,
        type: tenant.organization.type === 'INTERNAL' ? 'SUBSCRIPTION' : 'CUSTOMER_SALE',
        revenueAmount,
        currency,
        projectId: createdProject?.id || null,
        notes: body.notes || `Converted ${lead.businessName} via AutoSEO AI Acquisition Engine.`,
      },
    });

    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'CONVERTED',
        convertedProjectId: createdProject?.id || lead.convertedProjectId,
        lastInteractionAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      lead: updatedLead,
      conversion,
      project: createdProject,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to convert lead' }, { status: 500 });
  }
}
