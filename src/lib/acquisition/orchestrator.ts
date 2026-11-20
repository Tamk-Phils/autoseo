import prisma from '@/lib/db';
import {
  TenantContext,
  checkCreditAllowance,
  recordUsage,
} from './tenant';
import {
  discoverBusinessesWorldwide,
  verifyBusinessWebsite,
  normalizeBusinessName,
  normalizeDomain,
} from './discovery';
import { runLeadSeoAudit } from './seoAudit';
import { calculateDeterministicOpportunityScore } from './scoring';

/**
 * Runs a single lead through SSRF-safe SEO auditing and deterministic qualification scoring.
 */
export async function auditAndScoreLead(
  leadId: string,
  tenant: TenantContext,
  options?: { runPageSpeed?: boolean }
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: tenant.organization.id },
  });

  if (!lead) {
    throw new Error('Lead not found in your organization workspace');
  }

  if (!lead.websiteUrl) {
    // Score without audit so user still gets transparent explanation & missing info
    const score = calculateDeterministicOpportunityScore({
      businessName: lead.businessName,
      websiteUrl: null,
      websiteStatus: lead.websiteStatus,
      industry: lead.industry,
      country: lead.country,
      city: lead.city,
      address: lead.address,
      publicEmail: lead.publicEmail,
      publicPhone: lead.publicPhone,
      seoScore: null,
    });

    await prisma.leadScore.create({
      data: {
        organizationId: tenant.organization.id,
        leadId: lead.id,
        version: score.version,
        totalScore: score.totalScore,
        priority: score.priority,
        seoOpportunityPts: score.seoOpportunityPts,
        websiteQualityPts: score.websiteQualityPts,
        commercialRelevancePts: score.commercialRelevancePts,
        competitionPts: score.competitionPts,
        completenessPts: score.completenessPts,
        contactabilityPts: score.contactabilityPts,
        reasons: JSON.stringify(score.reasons),
        evidence: JSON.stringify(score.evidence),
        recommendedServices: JSON.stringify(score.recommendedServices),
        missingInfo: JSON.stringify(score.missingInfo),
        weightsUsed: JSON.stringify(score.weightsUsed),
      },
    });

    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        opportunityScore: score.totalScore,
        priority: score.priority,
      },
    });

    return { lead: updated, audit: null, score };
  }

  // Enforce server-side audit credits
  const creditCheck = await checkCreditAllowance(tenant, 'AUDIT', 1);
  if (!creditCheck.allowed) {
    throw new Error(creditCheck.reason || 'Audit credit limit reached');
  }

  // 1. Verify website reachability first
  const verification = await verifyBusinessWebsite(lead.websiteUrl);
  if (verification.status !== 'VERIFIED' || !verification.finalUrl) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { websiteStatus: 'UNREACHABLE' },
    });
    throw new Error(`Website ${lead.websiteUrl} is unreachable or blocked by SSRF safety rules.`);
  }

  // 2. Run evidence-based SSRF-safe SEO audit
  const auditResult = await runLeadSeoAudit(verification.finalUrl, {
    city: lead.city,
    industry: lead.industry,
    runPageSpeed: options?.runPageSpeed ?? false,
  });

  const savedAudit = await prisma.leadAudit.create({
    data: {
      organizationId: tenant.organization.id,
      leadId: lead.id,
      url: auditResult.finalUrl,
      scoringVersion: auditResult.scoringVersion,
      seoScore: auditResult.seoScore,
      technicalScore: auditResult.technicalScore,
      onPageScore: auditResult.onPageScore,
      performanceScore: auditResult.performanceScore,
      mobileScore: auditResult.mobileScore,
      structuredDataScore: auditResult.structuredDataScore,
      localSeoScore: auditResult.localSeoScore,
      securityScore: auditResult.securityScore,
      pageSpeedData: JSON.stringify(auditResult.pageSpeedData),
      measuredFacts: JSON.stringify(auditResult.measuredFacts),
      inferredInsights: JSON.stringify(auditResult.inferredInsights),
      unavailableData: JSON.stringify(auditResult.unavailableData),
      issues: JSON.stringify(auditResult.issues),
      rawEvidence: JSON.stringify(auditResult.rawEvidence),
    },
  });

  // Charge 1 audit credit ONLY after successful audit
  await recordUsage({
    organizationId: tenant.organization.id,
    userId: tenant.user.id,
    operation: 'AUDIT',
    creditsCharged: 1,
    referenceId: savedAudit.id,
  });

  // Enrich public contact details if newly found on the public website
  const enrichedEmail = lead.publicEmail || auditResult.discoveredEmail;
  const enrichedPhone = lead.publicPhone || auditResult.discoveredPhone;
  const contactSource =
    lead.contactSource ||
    (auditResult.discoveredEmail || auditResult.discoveredPhone ? 'PUBLIC_WEBSITE' : null);

  // 3. Deterministic Opportunity Score
  const score = calculateDeterministicOpportunityScore({
    businessName: lead.businessName,
    websiteUrl: auditResult.finalUrl,
    websiteStatus: 'VERIFIED',
    industry: lead.industry,
    country: lead.country,
    city: lead.city,
    address: lead.address,
    publicEmail: enrichedEmail,
    publicPhone: enrichedPhone,
    seoScore: auditResult.seoScore,
    auditIssues: auditResult.issues,
    rawEvidence: auditResult.rawEvidence,
  });

  const savedScore = await prisma.leadScore.create({
    data: {
      organizationId: tenant.organization.id,
      leadId: lead.id,
      version: score.version,
      totalScore: score.totalScore,
      priority: score.priority,
      seoOpportunityPts: score.seoOpportunityPts,
      websiteQualityPts: score.websiteQualityPts,
      commercialRelevancePts: score.commercialRelevancePts,
      competitionPts: score.competitionPts,
      completenessPts: score.completenessPts,
      contactabilityPts: score.contactabilityPts,
      reasons: JSON.stringify(score.reasons),
      evidence: JSON.stringify(score.evidence),
      recommendedServices: JSON.stringify(score.recommendedServices),
      missingInfo: JSON.stringify(score.missingInfo),
      weightsUsed: JSON.stringify(score.weightsUsed),
    },
  });

  // Advance pipeline stage automatically if still in DISCOVERED / ANALYSED
  let nextStatus = lead.status;
  if (lead.status === 'DISCOVERED' || lead.status === 'ANALYSED') {
    nextStatus = score.totalScore >= 60 ? 'QUALIFIED' : 'ANALYSED';
  }

  const updatedLead = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      websiteUrl: auditResult.finalUrl,
      normalizedDomain: normalizeDomain(auditResult.finalUrl),
      websiteStatus: 'VERIFIED',
      publicEmail: enrichedEmail,
      publicPhone: enrichedPhone,
      contactSource,
      seoScore: auditResult.seoScore,
      opportunityScore: score.totalScore,
      priority: score.priority,
      status: nextStatus,
    },
  });

  return { lead: updatedLead, audit: savedAudit, score: savedScore };
}

/**
 * Orchestrates a discovery campaign:
 * 1. Credit check
 * 2. Worldwide business discovery via authorized providers
 * 3. Deduplication & suppression check
 * 4. Website verification & initial automated SEO auditing + scoring
 */
export async function executeDiscoveryCampaign(campaignId: string, tenant: TenantContext) {
  const campaign = await prisma.acquisitionCampaign.findFirst({
    where: { id: campaignId, organizationId: tenant.organization.id },
  });

  if (!campaign) {
    throw new Error('Acquisition campaign not found in your organization');
  }

  const creditCheck = await checkCreditAllowance(tenant, 'DISCOVERY', 1);
  if (!creditCheck.allowed) {
    throw new Error(creditCheck.reason || 'Discovery credit limit reached');
  }

  await prisma.acquisitionCampaign.update({
    where: { id: campaign.id },
    data: { status: 'RUNNING', lastRunAt: new Date() },
  });

  let keywords: string[] = [];
  try {
    if (campaign.targetKeywords) keywords = JSON.parse(campaign.targetKeywords);
  } catch {
    keywords = [];
  }

  const maxToDiscover = Math.min(campaign.targetLeadCount || 25, creditCheck.remaining, 40);

  const discoveryRes = await discoverBusinessesWorldwide({
    industry: campaign.targetIndustry,
    country: campaign.targetCountry,
    city: campaign.targetCity,
    keywords,
    limit: maxToDiscover,
  });

  const run = await prisma.discoveryRun.create({
    data: {
      organizationId: tenant.organization.id,
      campaignId: campaign.id,
      status: discoveryRes.error && discoveryRes.businesses.length === 0 ? 'FAILED' : 'RUNNING',
      provider: discoveryRes.provider,
      queriesExecuted: JSON.stringify(discoveryRes.queriesExecuted),
      errorMessage: discoveryRes.error || null,
    },
  });

  if (discoveryRes.businesses.length === 0) {
    await prisma.discoveryRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', completedAt: new Date() },
    });
    await prisma.acquisitionCampaign.update({
      where: { id: campaign.id },
      data: { status: 'COMPLETED' },
    });
    return {
      runId: run.id,
      provider: discoveryRes.provider,
      discovered: 0,
      duplicatesSkipped: 0,
      audited: 0,
      qualified: 0,
      error: discoveryRes.error || 'No businesses returned for that query. Try a major city or broader industry.',
    };
  }

  // Load existing leads & suppression list for this organization to prevent duplicates
  const [existingLeads, suppressions] = await Promise.all([
    prisma.lead.findMany({
      where: { organizationId: tenant.organization.id },
      select: { normalizedName: true, normalizedDomain: true },
    }),
    prisma.suppressionEntry.findMany({
      where: { organizationId: tenant.organization.id },
      select: { identifier: true },
    }),
  ]);

  const existingNames = new Set(existingLeads.map((l) => l.normalizedName));
  const existingDomains = new Set(existingLeads.map((l) => l.normalizedDomain).filter(Boolean));
  const suppressedSet = new Set(suppressions.map((s) => s.identifier.toLowerCase()));

  let createdCount = 0;
  let duplicatesSkipped = 0;
  let websitesVerified = 0;
  let auditedCount = 0;
  let qualifiedCount = 0;

  const createdLeadIds: string[] = [];

  for (const biz of discoveryRes.businesses) {
    const normName = normalizeBusinessName(biz.businessName);
    const normDom = normalizeDomain(biz.websiteUrl);

    // Filter by campaign websiteCondition if user asked only for websites
    if (campaign.websiteCondition === 'SEO_ISSUES' || campaign.websiteCondition === 'ANY_WEBSITE') {
      // Keep businesses with websites prioritized; still store up to a small number if needed
      if (!biz.websiteUrl && createdCount >= 5) continue;
    }

    // Duplicate prevention
    if (existingNames.has(normName) || (normDom && existingDomains.has(normDom))) {
      duplicatesSkipped++;
      continue;
    }

    // Suppression check
    const isSuppressed =
      (biz.publicEmail && suppressedSet.has(biz.publicEmail.toLowerCase())) ||
      (normDom && suppressedSet.has(normDom));

    const lead = await prisma.lead.create({
      data: {
        organizationId: tenant.organization.id,
        campaignId: campaign.id,
        businessName: biz.businessName,
        normalizedName: normName,
        websiteUrl: biz.websiteUrl,
        normalizedDomain: normDom,
        websiteStatus: 'UNVERIFIED',
        country: biz.country,
        city: biz.city,
        address: biz.address,
        industry: biz.industry,
        publicEmail: biz.publicEmail,
        publicPhone: biz.publicPhone,
        contactSource: biz.contactSource,
        discoverySource: biz.discoverySource,
        status: isSuppressed ? 'UNSUBSCRIBED' : 'DISCOVERED',
        isOptedOut: Boolean(isSuppressed),
        assignedUserId: tenant.user.id,
      },
    });

    existingNames.add(normName);
    if (normDom) existingDomains.add(normDom);
    createdCount++;
    createdLeadIds.push(lead.id);
  }

  // Charge discovery credits ONLY for newly created non-duplicate records
  if (createdCount > 0) {
    await recordUsage({
      organizationId: tenant.organization.id,
      userId: tenant.user.id,
      operation: 'DISCOVERY',
      creditsCharged: createdCount,
      referenceId: run.id,
    });
  }

  // Audit & score the first batch of leads with websites (up to 6 synchronously so response stays fast within serverless timeout)
  const leadsToAudit = await prisma.lead.findMany({
    where: {
      id: { in: createdLeadIds },
      websiteUrl: { not: null },
      isOptedOut: false,
    },
    take: 6,
  });

  for (const lead of leadsToAudit) {
    try {
      const res = await auditAndScoreLead(lead.id, tenant, { runPageSpeed: false });
      websitesVerified++;
      auditedCount++;
      if ((res.lead.opportunityScore || 0) >= 60) {
        qualifiedCount++;
      }
    } catch {
      // Keep lead record even if site is unreachable
    }
  }

  // Score remaining leads without websites deterministically so they still have priority & missingInfo
  const remainingWithoutScore = await prisma.lead.findMany({
    where: {
      id: { in: createdLeadIds },
      opportunityScore: null,
    },
  });

  for (const lead of remainingWithoutScore) {
    const score = calculateDeterministicOpportunityScore({
      businessName: lead.businessName,
      websiteUrl: lead.websiteUrl,
      websiteStatus: lead.websiteStatus,
      industry: lead.industry,
      country: lead.country,
      city: lead.city,
      address: lead.address,
      publicEmail: lead.publicEmail,
      publicPhone: lead.publicPhone,
      seoScore: null,
      targetIndustry: campaign.targetIndustry,
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        opportunityScore: score.totalScore,
        priority: score.priority,
      },
    });
  }

  await prisma.discoveryRun.update({
    where: { id: run.id },
    data: {
      status: 'COMPLETED',
      businessesFound: createdCount,
      duplicatesSkipped,
      websitesVerified,
      completedAt: new Date(),
    },
  });

  await prisma.acquisitionCampaign.update({
    where: { id: campaign.id },
    data: {
      status: 'COMPLETED',
      discoveredCount: { increment: createdCount },
      auditedCount: { increment: auditedCount },
      qualifiedCount: { increment: qualifiedCount },
    },
  });

  return {
    runId: run.id,
    provider: discoveryRes.provider,
    discovered: createdCount,
    duplicatesSkipped,
    websitesVerified,
    audited: auditedCount,
    qualified: qualifiedCount,
  };
}
