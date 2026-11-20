import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { resolveTenantContext } from '@/lib/acquisition/tenant';
import { normalizeBusinessName, normalizeDomain, cleanWebsiteUrl } from '@/lib/acquisition/discovery';

export const dynamic = 'force-dynamic';

const CreateLeadSchema = z.object({
  businessName: z.string().min(2).max(160),
  websiteUrl: z.string().max(300).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  publicEmail: z.string().email().optional().nullable().or(z.literal('')),
  publicPhone: z.string().max(50).optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get('search')?.trim();
    const status = url.searchParams.get('status')?.trim();
    const priority = url.searchParams.get('priority')?.trim();
    const country = url.searchParams.get('country')?.trim();
    const industry = url.searchParams.get('industry')?.trim();
    const campaignId = url.searchParams.get('campaignId')?.trim();

    const where: any = { organizationId: tenant.organization.id };

    if (status && status !== 'ALL') where.status = status;
    if (priority && priority !== 'ALL') where.priority = priority;
    if (country && country !== 'ALL') where.country = { contains: country, mode: 'insensitive' };
    if (industry && industry !== 'ALL') where.industry = { contains: industry, mode: 'insensitive' };
    if (campaignId) where.campaignId = campaignId;

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { websiteUrl: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: [{ opportunityScore: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        campaign: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        _count: { select: { audits: true, outreachMessages: true, notes: true } },
      },
    });

    return NextResponse.json({
      success: true,
      workspace: tenant.organization,
      leads,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load leads' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid lead input', details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    const normName = normalizeBusinessName(d.businessName);
    const cleanedUrl = cleanWebsiteUrl(d.websiteUrl);
    const normDomain = normalizeDomain(cleanedUrl);

    // Duplicate check within organization
    const existing = await prisma.lead.findFirst({
      where: {
        organizationId: tenant.organization.id,
        OR: [
          { normalizedName: normName },
          ...(normDomain ? [{ normalizedDomain: normDomain }] : []),
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A matching business lead already exists in your workspace.', existingLeadId: existing.id },
        { status: 409 }
      );
    }

    const lead = await prisma.lead.create({
      data: {
        organizationId: tenant.organization.id,
        businessName: d.businessName.trim(),
        normalizedName: normName,
        websiteUrl: cleanedUrl,
        normalizedDomain: normDomain,
        websiteStatus: 'UNVERIFIED',
        country: d.country?.trim() || null,
        city: d.city?.trim() || null,
        industry: d.industry?.trim() || null,
        publicEmail: d.publicEmail?.trim() || null,
        publicPhone: d.publicPhone?.trim() || null,
        contactSource: d.publicEmail || d.publicPhone ? 'MANUAL_ENTRY' : null,
        discoverySource: 'MANUAL',
        assignedUserId: tenant.user.id,
      },
    });

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create lead' }, { status: 500 });
  }
}
