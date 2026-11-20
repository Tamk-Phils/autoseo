import prisma from '@/lib/db';
import {
  discoverBusinessesWorldwide,
  normalizeBusinessName,
  normalizeDomain,
} from './discovery';
import { auditAndScoreLead } from './orchestrator';
import { generatePersonalizedProposal } from './salesAgent';
import { PLAN_LIMITS, PlanTier, TenantContext } from './tenant';
import { inferSiteNicheAndMarket, InferredSiteProfile } from './nicheInference';

export { inferSiteNicheAndMarket };
export type { InferredSiteProfile };

/**
 * Queries live public search autocomplete APIs (Google Suggest + DuckDuckGo Autocomplete)
 * to harvest real, high-intent search queries people type for this website's niche.
 */
export async function expandNicheKeywordsOnline(
  profile: InferredSiteProfile,
  extraSeeds: string[] = []
): Promise<string[]> {
  const seeds = Array.from(
    new Set([
      ...profile.nicheKeywords.slice(0, 12),
      ...extraSeeds.filter((s) => s && s.trim().length >= 3).slice(0, 10),
    ])
  ).slice(0, 18);

  const discovered = new Set<string>(profile.nicheKeywords);

  for (const seed of seeds) {
    // 1. Google public autocomplete suggestions
    try {
      const res = await fetch(
        `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(seed)}`,
        {
          headers: { Accept: 'application/json', 'User-Agent': 'AutoSEO-KeywordMiner/1.0' },
          signal: AbortSignal.timeout(3000),
        }
      );
      if (res.ok) {
        const payload = await res.json();
        for (const item of Array.isArray(payload?.[1]) ? payload[1] : []) {
          if (typeof item === 'string' && item.trim().length >= 3) {
            discovered.add(item.trim());
          }
        }
      }
    } catch {}

    // 2. DuckDuckGo public autocomplete suggestions
    try {
      const res = await fetch(
        `https://duckduckgo.com/ac/?q=${encodeURIComponent(seed)}&type=list`,
        {
          headers: { Accept: 'application/json', 'User-Agent': 'AutoSEO-KeywordMiner/1.0' },
          signal: AbortSignal.timeout(3000),
        }
      );
      if (res.ok) {
        const payload = await res.json();
        const list = Array.isArray(payload?.[1]) ? payload[1] : [];
        for (const item of list) {
          if (typeof item === 'string' && item.trim().length >= 3) {
            discovered.add(item.trim());
          }
        }
      }
    } catch {}

    if (discovered.size >= 180) break;
  }

  return Array.from(discovered).slice(0, 180);
}

/**
 * Resolves a TenantContext for a project's owner so autonomous background jobs
 * run strictly inside that owner's isolated organization workspace.
 */
async function resolveOwnerTenantForProject(projectId: string): Promise<{
  project: any;
  tenant: TenantContext;
} | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      user: { select: { id: true, email: true, name: true, role: true } },
      pages: {
        take: 20,
        select: { title: true, h1: true, metaDescription: true, path: true },
      },
    },
  });

  if (!project || !project.user) return null;

  let org = project.organizationId
    ? await prisma.organization.findUnique({ where: { id: project.organizationId } })
    : null;

  if (!org) {
    org = await prisma.organization.findFirst({
      where: { ownerId: project.user.id, type: 'SUBSCRIBER' },
    });
  }

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: project.user.name ? `${project.user.name}'s Workspace` : `${project.user.email.split('@')[0]} Workspace`,
        type: 'SUBSCRIBER',
        plan: 'STARTER',
        ownerId: project.user.id,
        members: {
          create: { userId: project.user.id, role: 'OWNER' },
        },
      },
    });
    await prisma.project.update({
      where: { id: project.id },
      data: { organizationId: org.id },
    });
  }

  const plan = (PLAN_LIMITS[org.plan as PlanTier] ? org.plan : 'STARTER') as PlanTier;

  return {
    project,
    tenant: {
      user: project.user,
      organization: {
        id: org.id,
        name: org.name,
        type: org.type === 'INTERNAL' ? 'INTERNAL' : 'SUBSCRIBER',
        plan,
      },
      isAdmin: project.user.role === 'ADMIN' || project.user.role === 'SUPER_ADMIN',
      limits: PLAN_LIMITS[plan],
    },
  };
}

/**
 * 100% Zero-Manual Autonomous Business & People Discovery for a Project:
 * 1. Understands the project's website niche, keywords & market automatically
 * 2. Auto-creates/reuses an Autonomous Discovery Campaign
 * 3. Discovers matching businesses & public contacts via native zero-key discovery
 * 4. Verifies websites, runs SSRF-safe SEO + Web Vitals audits & deterministic scoring
 * 5. Auto-generates personalized AI sales proposals for Priority A/B prospects (queued safely for review)
 */
export async function runAutonomousDiscoveryForProject(projectId: string) {
  const ctx = await resolveOwnerTenantForProject(projectId);
  if (!ctx) return { skipped: true, reason: 'Project or owner not found' };

  const { project, tenant } = ctx;
  const profile = inferSiteNicheAndMarket(project, project.pages);

  // Persist inferred industry on project if it was blank/General
  if (!project.industry || project.industry === 'General') {
    await prisma.project.update({
      where: { id: project.id },
      data: { industry: profile.industry },
    });
  }

  const campaignName = `[Autonomous] ${profile.industry} — ${project.domain}`;
  let campaign = await prisma.acquisitionCampaign.findFirst({
    where: {
      organizationId: tenant.organization.id,
      name: campaignName,
    },
  });

  // Throttle autonomous discovery per campaign to once every 30 minutes to keep DB & network fast
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  if (campaign?.lastRunAt && campaign.lastRunAt > thirtyMinutesAgo) {
    return { skipped: true, reason: 'Autonomous discovery ran recently for this project' };
  }

  if (!campaign) {
    campaign = await prisma.acquisitionCampaign.create({
      data: {
        organizationId: tenant.organization.id,
        createdById: tenant.user.id,
        name: campaignName,
        description: `Automatically created by AutoSEO after understanding ${project.domain} (${profile.industry}).`,
        targetCountry: profile.country,
        targetCity: profile.city,
        targetIndustry: profile.industry,
        targetKeywords: JSON.stringify(profile.nicheKeywords.slice(0, 12)),
        websiteCondition: 'SEO_ISSUES',
        targetLeadCount: 15,
        status: 'RUNNING',
        lastRunAt: new Date(),
      },
    });
  } else {
    await prisma.acquisitionCampaign.update({
      where: { id: campaign.id },
      data: { status: 'RUNNING', lastRunAt: new Date() },
    });
  }

  const discoveryRes = await discoverBusinessesWorldwide({
    industry: profile.industry,
    country: profile.country,
    city: profile.city,
    keywords: profile.nicheKeywords.slice(0, 5),
    limit: 15,
  });

  const run = await prisma.discoveryRun.create({
    data: {
      organizationId: tenant.organization.id,
      campaignId: campaign.id,
      status: discoveryRes.businesses.length > 0 ? 'RUNNING' : 'FAILED',
      provider: discoveryRes.provider,
      queriesExecuted: JSON.stringify(discoveryRes.queriesExecuted),
      errorMessage: discoveryRes.error || null,
    },
  });

  const existingLeads = await prisma.lead.findMany({
    where: { organizationId: tenant.organization.id },
    select: { normalizedName: true, normalizedDomain: true },
  });
  const existingNames = new Set(existingLeads.map((l) => l.normalizedName));
  const existingDomains = new Set(existingLeads.map((l) => l.normalizedDomain).filter(Boolean));
  const ownDomain = normalizeDomain(project.domain);

  let discoveredCount = 0;
  let duplicatesSkipped = 0;
  let auditedCount = 0;
  let qualifiedCount = 0;
  let proposalsDrafted = 0;
  const newLeadIds: string[] = [];

  for (const biz of discoveryRes.businesses) {
    const normName = normalizeBusinessName(biz.businessName);
    const normDom = normalizeDomain(biz.websiteUrl);

    // Skip the user's own website and duplicates
    if (normDom && ownDomain && normDom === ownDomain) continue;
    if (existingNames.has(normName) || (normDom && existingDomains.has(normDom))) {
      duplicatesSkipped++;
      continue;
    }

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
        assignedUserId: tenant.user.id,
      },
    });

    existingNames.add(normName);
    if (normDom) existingDomains.add(normDom);
    discoveredCount++;
    newLeadIds.push(lead.id);
  }

  // Automatically audit, score, and draft personalized proposals for up to 3 new prospects per cycle
  const leadsToProcess = await prisma.lead.findMany({
    where: {
      id: { in: newLeadIds },
      websiteUrl: { not: null },
    },
    take: 3,
  });

  for (const lead of leadsToProcess) {
    try {
      const auditRes = await auditAndScoreLead(lead.id, tenant, { runPageSpeed: false });
      auditedCount++;
      const oppScore = auditRes.lead.opportunityScore || 0;
      if (oppScore >= 60) {
        qualifiedCount++;
        // Auto-draft personalized proposal for qualified leads (queued as PENDING_APPROVAL for compliance)
        let issues: any[] = [];
        try {
          if (auditRes.audit && 'issues' in auditRes.audit && auditRes.audit.issues) {
            issues = JSON.parse(auditRes.audit.issues);
          }
        } catch {}

        const proposal = await generatePersonalizedProposal({
          businessName: auditRes.lead.businessName,
          websiteUrl: auditRes.lead.websiteUrl,
          industry: auditRes.lead.industry,
          city: auditRes.lead.city,
          country: auditRes.lead.country,
          seoScore: auditRes.lead.seoScore,
          opportunityScore: oppScore,
          issues,
          recommendedServices: ['Autonomous SEO & Web Vitals Optimization'],
          senderBrandName: tenant.organization.name,
          channel: 'EMAIL',
        });

        await prisma.outreachMessage.create({
          data: {
            organizationId: tenant.organization.id,
            leadId: auditRes.lead.id,
            channel: 'EMAIL',
            direction: 'OUTBOUND',
            subject: proposal.subject,
            body: proposal.body,
            proposalSummary: proposal.proposalSummary,
            status: 'PENDING_APPROVAL',
            sequenceStep: 1,
          },
        });
        proposalsDrafted++;
      }
    } catch {
      // Continue processing next prospect
    }
  }

  await prisma.discoveryRun.update({
    where: { id: run.id },
    data: {
      status: 'COMPLETED',
      businessesFound: discoveredCount,
      duplicatesSkipped,
      websitesVerified: auditedCount,
      completedAt: new Date(),
    },
  });

  await prisma.acquisitionCampaign.update({
    where: { id: campaign.id },
    data: {
      status: 'COMPLETED',
      discoveredCount: { increment: discoveredCount },
      auditedCount: { increment: auditedCount },
      qualifiedCount: { increment: qualifiedCount },
    },
  });

  await prisma.auditLog.create({
    data: {
      projectId: project.id,
      action: 'AUTONOMOUS_DISCOVERY_COMPLETED',
      details: `Understood site niche (${profile.industry} in ${profile.country}) and automatically discovered ${discoveredCount} prospects, audited ${auditedCount} websites, qualified ${qualifiedCount} leads, and drafted ${proposalsDrafted} proposals.`,
    },
  });

  return {
    success: true,
    industry: profile.industry,
    discoveredCount,
    auditedCount,
    qualifiedCount,
    proposalsDrafted,
  };
}
