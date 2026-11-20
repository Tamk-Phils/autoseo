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

    const [messages, suppressions] = await Promise.all([
      prisma.outreachMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 150,
        include: {
          lead: {
            select: {
              id: true,
              businessName: true,
              websiteUrl: true,
              publicEmail: true,
              publicPhone: true,
              status: true,
              seoScore: true,
              opportunityScore: true,
              isOptedOut: true,
            },
          },
          approvedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.suppressionEntry.findMany({
        where: { organizationId: tenant.organization.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    return NextResponse.json({
      success: true,
      workspace: tenant.organization,
      messages,
      suppressions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load outreach center' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const identifier = String(body.identifier || '').trim().toLowerCase();
    const reason = String(body.reason || 'MANUAL_BLOCK').toUpperCase();

    if (!identifier) {
      return NextResponse.json({ error: 'Email or domain identifier is required' }, { status: 400 });
    }

    const entry = await prisma.suppressionEntry.upsert({
      where: {
        organizationId_identifier: {
          organizationId: tenant.organization.id,
          identifier,
        },
      },
      update: { reason },
      create: {
        organizationId: tenant.organization.id,
        identifier,
        reason,
        source: `user:${tenant.user.email}`,
      },
    });

    // Also mark any matching leads as opted out
    await prisma.lead.updateMany({
      where: {
        organizationId: tenant.organization.id,
        OR: [{ publicEmail: { equals: identifier, mode: 'insensitive' } }, { normalizedDomain: identifier }],
      },
      data: { isOptedOut: true, status: 'UNSUBSCRIBED' },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add suppression entry' }, { status: 500 });
  }
}
