import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveTenantContext, checkCreditAllowance, recordUsage } from '@/lib/acquisition/tenant';

export const dynamic = 'force-dynamic';

function csvEscape(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function POST(req: Request) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const creditCheck = await checkCreditAllowance(tenant, 'EXPORT', 1);
    if (!creditCheck.allowed) {
      return NextResponse.json({ error: creditCheck.reason }, { status: 402 });
    }

    const body = await req.json().catch(() => ({}));
    const where: any = {
      organizationId: tenant.organization.id,
      isOptedOut: false,
      status: { not: 'UNSUBSCRIBED' },
    };
    if (body.status && body.status !== 'ALL') where.status = body.status;
    if (body.priority && body.priority !== 'ALL') where.priority = body.priority;

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { opportunityScore: 'desc' },
      take: Math.min(500, tenant.limits.exportLimit),
    });

    const headers = [
      'Business Name',
      'Website',
      'Website Status',
      'Industry',
      'Country',
      'City',
      'Public Email',
      'Public Phone',
      'SEO Score',
      'Opportunity Score',
      'Priority',
      'Status',
      'Discovery Source',
    ];

    const rows = [headers.join(',')];
    for (const l of leads) {
      rows.push(
        [
          l.businessName,
          l.websiteUrl,
          l.websiteStatus,
          l.industry,
          l.country,
          l.city,
          l.publicEmail,
          l.publicPhone,
          l.seoScore,
          l.opportunityScore,
          l.priority,
          l.status,
          l.discoverySource,
        ]
          .map(csvEscape)
          .join(',')
      );
    }

    await recordUsage({
      organizationId: tenant.organization.id,
      userId: tenant.user.id,
      operation: 'EXPORT',
      creditsCharged: 1,
    });

    return new NextResponse(rows.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="autoseo-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
