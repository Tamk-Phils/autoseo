import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveTenantContext, checkCreditAllowance, recordUsage } from '@/lib/acquisition/tenant';
import { generatePersonalizedProposal } from '@/lib/acquisition/salesAgent';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
      include: {
        audits: { orderBy: { createdAt: 'desc' }, take: 1 },
        scores: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.isOptedOut || lead.status === 'UNSUBSCRIBED') {
      return NextResponse.json(
        { error: 'Cannot generate outreach for an unsubscribed/suppressed lead.' },
        { status: 400 }
      );
    }

    // Check suppression list
    const suppressChecks = [lead.publicEmail?.toLowerCase(), lead.normalizedDomain].filter(Boolean) as string[];
    if (suppressChecks.length > 0) {
      const suppressed = await prisma.suppressionEntry.findFirst({
        where: {
          organizationId: tenant.organization.id,
          identifier: { in: suppressChecks },
        },
      });
      if (suppressed) {
        return NextResponse.json(
          { error: `Contact is on your organization suppression list (${suppressed.reason}).` },
          { status: 400 }
        );
      }
    }

    const creditCheck = await checkCreditAllowance(tenant, 'PROPOSAL', 1);
    if (!creditCheck.allowed) {
      return NextResponse.json({ error: creditCheck.reason }, { status: 402 });
    }

    const body = await req.json().catch(() => ({}));
    const channel = ['EMAIL', 'WHATSAPP', 'LINKEDIN'].includes(body.channel) ? body.channel : 'EMAIL';

    const latestAudit = lead.audits[0];
    const latestScore = lead.scores[0];

    let issues: Array<{ category: string; severity: string; title: string; evidence: string }> = [];
    let recommendedServices: string[] = [];
    try {
      if (latestAudit?.issues) issues = JSON.parse(latestAudit.issues);
    } catch {}
    try {
      if (latestScore?.recommendedServices) recommendedServices = JSON.parse(latestScore.recommendedServices);
    } catch {}

    const senderBrand =
      tenant.organization.type === 'INTERNAL' ? 'AutoSEO Team' : tenant.organization.name;

    const generated = await generatePersonalizedProposal({
      businessName: lead.businessName,
      websiteUrl: lead.websiteUrl,
      industry: lead.industry,
      city: lead.city,
      country: lead.country,
      seoScore: lead.seoScore,
      opportunityScore: lead.opportunityScore,
      issues,
      recommendedServices,
      senderBrandName: senderBrand,
      channel,
    });

    // Save as PENDING_APPROVAL so human approval is enforced before initial outreach
    const message = await prisma.outreachMessage.create({
      data: {
        organizationId: tenant.organization.id,
        leadId: lead.id,
        channel,
        direction: 'OUTBOUND',
        subject: generated.subject,
        body: generated.body,
        proposalSummary: generated.proposalSummary,
        status: 'PENDING_APPROVAL',
        sequenceStep: 1,
      },
    });

    await recordUsage({
      organizationId: tenant.organization.id,
      userId: tenant.user.id,
      operation: 'PROPOSAL',
      creditsCharged: 1,
      aiProvider: generated.provider,
      estimatedCostUsd: generated.estimatedCostUsd,
      referenceId: message.id,
    });

    return NextResponse.json({
      success: true,
      message,
      provider: generated.provider,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate proposal' }, { status: 500 });
  }
}
