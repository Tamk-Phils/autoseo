import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { resolveTenantContext } from '@/lib/acquisition/tenant';
import { executeDiscoveryCampaign } from '@/lib/acquisition/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CreateCampaignSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  targetCountry: z.string().min(2).max(80),
  targetCity: z.string().max(80).optional().nullable(),
  targetIndustry: z.string().min(2).max(100),
  targetKeywords: z.array(z.string().max(60)).optional(),
  websiteCondition: z.enum(['SEO_ISSUES', 'ANY_WEBSITE', 'NO_WEBSITE', 'ALL']).optional(),
  targetLeadCount: z.number().int().min(5).max(200).optional(),
  scheduleCron: z.string().max(60).optional().nullable(),
  autoStart: z.boolean().optional(),
});

export async function GET() {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const campaigns = await prisma.acquisitionCampaign.findMany({
      where: { organizationId: tenant.organization.id },
      orderBy: { createdAt: 'desc' },
      include: {
        discoveryRuns: {
          orderBy: { startedAt: 'desc' },
          take: 3,
        },
        _count: { select: { leads: true } },
      },
    });

    return NextResponse.json({
      success: true,
      workspace: tenant.organization,
      campaigns,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid campaign parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const campaign = await prisma.acquisitionCampaign.create({
      data: {
        organizationId: tenant.organization.id,
        createdById: tenant.user.id,
        name: d.name.trim(),
        description: d.description?.trim() || null,
        targetCountry: d.targetCountry.trim(),
        targetCity: d.targetCity?.trim() || null,
        targetIndustry: d.targetIndustry.trim(),
        targetKeywords: d.targetKeywords ? JSON.stringify(d.targetKeywords) : null,
        websiteCondition: d.websiteCondition || 'SEO_ISSUES',
        targetLeadCount: d.targetLeadCount || 25,
        scheduleCron: d.scheduleCron || null,
        status: 'DRAFT',
      },
    });

    let runSummary = null;
    if (d.autoStart) {
      runSummary = await executeDiscoveryCampaign(campaign.id, tenant);
    }

    const updated = await prisma.acquisitionCampaign.findUnique({
      where: { id: campaign.id },
      include: { discoveryRuns: { orderBy: { startedAt: 'desc' }, take: 1 } },
    });

    return NextResponse.json({
      success: true,
      campaign: updated,
      runSummary,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create campaign' }, { status: 500 });
  }
}
