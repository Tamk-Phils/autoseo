import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveTenantContext, getMonthlyUsage } from '@/lib/acquisition/tenant';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const orgId = tenant.organization.id;
    const url = new URL(req.url);
    const countryFilter = url.searchParams.get('country') || undefined;
    const industryFilter = url.searchParams.get('industry') || undefined;
    const campaignId = url.searchParams.get('campaignId') || undefined;

    const leadWhere: any = { organizationId: orgId };
    if (countryFilter) leadWhere.country = { contains: countryFilter, mode: 'insensitive' };
    if (industryFilter) leadWhere.industry = { contains: industryFilter, mode: 'insensitive' };
    if (campaignId) leadWhere.campaignId = campaignId;

    const [leads, auditsCount, messages, conversions, campaigns, followUpsPending, usage] =
      await Promise.all([
        prisma.lead.findMany({
          where: leadWhere,
          select: {
            id: true,
            websiteStatus: true,
            seoScore: true,
            opportunityScore: true,
            priority: true,
            status: true,
            country: true,
            industry: true,
            createdAt: true,
          },
        }),
        prisma.leadAudit.count({ where: { organizationId: orgId } }),
        prisma.outreachMessage.findMany({
          where: { organizationId: orgId },
          select: { status: true, replyClassification: true, channel: true, createdAt: true },
        }),
        prisma.conversionEvent.findMany({
          where: { organizationId: orgId },
          orderBy: { convertedAt: 'desc' },
        }),
        prisma.acquisitionCampaign.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.followUpTask.count({
          where: { organizationId: orgId, status: 'PENDING' },
        }),
        getMonthlyUsage(orgId),
      ]);

    const totalDiscovered = leads.length;
    const verifiedWebsites = leads.filter((l) => l.websiteStatus === 'VERIFIED').length;
    const qualifiedLeads = leads.filter((l) => (l.opportunityScore || 0) >= 60).length;
    const priorityALeads = leads.filter((l) => l.priority === 'A').length;

    const pendingApprovals = messages.filter((m) => m.status === 'PENDING_APPROVAL' || m.status === 'DRAFT').length;
    const sentMessages = messages.filter((m) => m.status === 'SENT' || m.status === 'REPLIED').length;
    const repliedMessages = messages.filter((m) => m.replyClassification !== null).length;
    const positiveReplies = messages.filter((m) =>
      ['INTERESTED', 'REQUESTING_PRICING', 'REQUESTING_INFO'].includes(m.replyClassification || '')
    ).length;

    const contactedLeads = leads.filter((l) =>
      ['CONTACTED', 'INTERESTED', 'CONVERTED'].includes(l.status)
    ).length;
    const interestedLeads = leads.filter((l) => ['INTERESTED', 'CONVERTED'].includes(l.status)).length;
    const convertedLeads = leads.filter((l) => l.status === 'CONVERTED').length;

    const totalRevenue = conversions.reduce((acc, c) => acc + (c.revenueAmount || 0), 0);
    const totalSpendUsd = usage.totalEstimatedCostUsd;

    const pipelineBreakdown: Record<string, number> = {
      DISCOVERED: 0,
      ANALYSED: 0,
      QUALIFIED: 0,
      CONTACT_APPROVED: 0,
      CONTACTED: 0,
      INTERESTED: 0,
      CONVERTED: 0,
      REJECTED: 0,
      DISQUALIFIED: 0,
      LOST: 0,
      UNSUBSCRIBED: 0,
    };

    const byCountry: Record<string, number> = {};
    const byIndustry: Record<string, number> = {};

    for (const l of leads) {
      pipelineBreakdown[l.status] = (pipelineBreakdown[l.status] || 0) + 1;
      if (l.country) byCountry[l.country] = (byCountry[l.country] || 0) + 1;
      if (l.industry) byIndustry[l.industry] = (byIndustry[l.industry] || 0) + 1;
    }

    const rate = (num: number, den: number) => (den > 0 ? Number(((num / den) * 100).toFixed(1)) : 0);

    return NextResponse.json({
      success: true,
      workspace: tenant.organization,
      isAdmin: tenant.isAdmin,
      limits: tenant.limits,
      usage,
      kpis: {
        totalDiscovered,
        verifiedWebsites,
        auditsCompleted: auditsCount,
        qualifiedLeads,
        priorityALeads,
        pendingApprovals,
        contactedLeads,
        interestedLeads,
        convertedLeads,
        followUpsPending,
        totalSpendUsd,
        totalRevenueUsd: Number(totalRevenue.toFixed(2)),
      },
      rates: {
        websiteVerificationRate: rate(verifiedWebsites, totalDiscovered),
        auditCompletionRate: rate(auditsCount, Math.max(verifiedWebsites, 1)),
        qualificationRate: rate(qualifiedLeads, totalDiscovered),
        outreachResponseRate: rate(repliedMessages, sentMessages),
        positiveResponseRate: rate(positiveReplies, sentMessages),
        leadToCustomerConversionRate: rate(convertedLeads, totalDiscovered),
        costPerQualifiedLeadUsd: qualifiedLeads > 0 ? Number((totalSpendUsd / qualifiedLeads).toFixed(4)) : 0,
        customerAcquisitionCostUsd: convertedLeads > 0 ? Number((totalSpendUsd / convertedLeads).toFixed(4)) : 0,
      },
      pipelineBreakdown,
      byCountry: Object.entries(byCountry).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      byIndustry: Object.entries(byIndustry).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      recentCampaigns: campaigns,
      recentConversions: conversions.slice(0, 10),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to compute analytics' }, { status: 500 });
  }
}
