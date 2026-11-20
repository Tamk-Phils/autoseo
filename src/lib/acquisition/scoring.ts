export interface ScoringWeights {
  seoOpportunity: number;      // default 30
  websiteQuality: number;      // default 20
  commercialRelevance: number; // default 20
  competition: number;         // default 15
  completeness: number;        // default 10
  contactability: number;      // default 5
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  seoOpportunity: 30,
  websiteQuality: 20,
  commercialRelevance: 20,
  competition: 15,
  completeness: 10,
  contactability: 5,
};

export interface LeadScoringInput {
  businessName: string;
  websiteUrl: string | null;
  websiteStatus: string;
  industry: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  seoScore: number | null;
  auditIssues?: Array<{ category: string; severity: string; title: string }>;
  rawEvidence?: {
    isHttps?: boolean;
    wordCount?: number;
    hasViewport?: boolean;
    schemaTypes?: string[];
    title?: string | null;
    metaDescription?: string | null;
  } | null;
  targetIndustry?: string | null;
}

export interface LeadScoringResult {
  version: string;
  totalScore: number;
  priority: 'A' | 'B' | 'C' | 'LOW';
  seoOpportunityPts: number;
  websiteQualityPts: number;
  commercialRelevancePts: number;
  competitionPts: number;
  completenessPts: number;
  contactabilityPts: number;
  reasons: string[];
  evidence: string[];
  recommendedServices: string[];
  missingInfo: string[];
  weightsUsed: ScoringWeights;
}

/**
 * Deterministic, transparent, versioned (v1.0) 100-point Opportunity Scoring Engine.
 * Never invents evidence — all points derive directly from verified lead & audit attributes.
 */
export function calculateDeterministicOpportunityScore(
  input: LeadScoringInput,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): LeadScoringResult {
  const reasons: string[] = [];
  const evidence: string[] = [];
  const recommendedServices: string[] = [];
  const missingInfo: string[] = [];

  // 1. SEO Improvement Opportunities (max 30)
  // Highest commercial SEO opportunity is a live website with clear, fixable SEO gaps (score 25–78)
  let seoOpportunityPts = 0;
  if (input.websiteStatus === 'VERIFIED' && typeof input.seoScore === 'number') {
    if (input.seoScore < 50) {
      seoOpportunityPts = weights.seoOpportunity;
      reasons.push(`Major SEO improvement opportunity detected (measured SEO score: ${input.seoScore}/100).`);
    } else if (input.seoScore < 70) {
      seoOpportunityPts = Math.round(weights.seoOpportunity * 0.85);
      reasons.push(`Strong SEO optimization upside (measured SEO score: ${input.seoScore}/100).`);
    } else if (input.seoScore < 85) {
      seoOpportunityPts = Math.round(weights.seoOpportunity * 0.55);
      reasons.push(`Moderate SEO enhancement potential (measured SEO score: ${input.seoScore}/100).`);
    } else {
      seoOpportunityPts = Math.round(weights.seoOpportunity * 0.25);
      reasons.push(`Website is already well-optimized (${input.seoScore}/100); lower urgent SEO need.`);
    }

    const highIssues = (input.auditIssues || []).filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH');
    if (highIssues.length > 0) {
      evidence.push(`${highIssues.length} high/critical SEO issues verified: ${highIssues.slice(0, 3).map((i) => i.title).join(', ')}.`);
    }
  } else if (input.websiteUrl) {
    seoOpportunityPts = Math.round(weights.seoOpportunity * 0.45);
    missingInfo.push('Website has not completed a verified SEO audit yet.');
  } else {
    seoOpportunityPts = Math.round(weights.seoOpportunity * 0.35);
    missingInfo.push('No verified website URL found yet (verify before classifying as no-website).');
  }

  // 2. Business Website Quality (max 20)
  // An active, real business site (HTTPS, decent content) indicates budget & readiness to invest
  let websiteQualityPts = 0;
  if (input.websiteStatus === 'VERIFIED') {
    websiteQualityPts += Math.round(weights.websiteQuality * 0.45);
    evidence.push(`Verified live business website: ${input.websiteUrl}`);
    if (input.rawEvidence?.isHttps) websiteQualityPts += Math.round(weights.websiteQuality * 0.2);
    if (input.rawEvidence?.hasViewport) websiteQualityPts += Math.round(weights.websiteQuality * 0.15);
    if ((input.rawEvidence?.wordCount || 0) >= 200) websiteQualityPts += Math.round(weights.websiteQuality * 0.2);
  } else if (input.websiteUrl) {
    websiteQualityPts = Math.round(weights.websiteQuality * 0.25);
  }
  websiteQualityPts = Math.min(weights.websiteQuality, websiteQualityPts);

  // 3. Commercial Relevance (max 20)
  let commercialRelevancePts = Math.round(weights.commercialRelevance * 0.6);
  const highIntentIndustries = /dent|clinic|law|attorney|real estate|auto|restaurant|hotel|agency|plumb|hvac|roof|jewel|medical|account|software|consult/i;
  if (input.industry && highIntentIndustries.test(input.industry)) {
    commercialRelevancePts = weights.commercialRelevance;
    reasons.push(`High-LTV commercial industry (${input.industry}) where organic search directly drives bookings/leads.`);
  } else if (
    input.targetIndustry &&
    input.industry &&
    input.industry.toLowerCase().includes(input.targetIndustry.toLowerCase())
  ) {
    commercialRelevancePts = Math.round(weights.commercialRelevance * 0.9);
  }

  // 4. Local / Search Competition Opportunity (max 15)
  let competitionPts = Math.round(weights.competition * 0.5);
  if (input.city && input.country) {
    competitionPts = Math.round(weights.competition * 0.85);
    evidence.push(`Localized market presence: ${input.city}, ${input.country}.`);
    if (input.rawEvidence && (!input.rawEvidence.schemaTypes || input.rawEvidence.schemaTypes.length === 0)) {
      competitionPts = weights.competition;
      reasons.push('Missing structured data creates a quick-win local SERP advantage over competitors.');
    }
  } else {
    missingInfo.push('Specific city/locality data is incomplete.');
  }

  // 5. Business Information Completeness (max 10)
  let completenessFields = 0;
  if (input.businessName) completenessFields++;
  if (input.websiteUrl) completenessFields++;
  if (input.industry) completenessFields++;
  if (input.country) completenessFields++;
  if (input.city || input.address) completenessFields++;
  const completenessPts = Math.round((completenessFields / 5) * weights.completeness);

  // 6. Contactability (max 5)
  let contactabilityPts = 0;
  if (input.publicEmail && input.publicPhone) {
    contactabilityPts = weights.contactability;
    evidence.push('Public email and phone contact channels verified.');
  } else if (input.publicEmail) {
    contactabilityPts = Math.round(weights.contactability * 0.8);
    evidence.push('Public business email available.');
  } else if (input.publicPhone) {
    contactabilityPts = Math.round(weights.contactability * 0.6);
    evidence.push('Public business phone available.');
    missingInfo.push('Public business email address not yet identified.');
  } else {
    missingInfo.push('No public email or phone contact channel discovered yet.');
  }

  const totalScore = Math.max(
    0,
    Math.min(
      100,
      seoOpportunityPts +
        websiteQualityPts +
        commercialRelevancePts +
        competitionPts +
        completenessPts +
        contactabilityPts
    )
  );

  const priority: 'A' | 'B' | 'C' | 'LOW' =
    totalScore >= 80 ? 'A' : totalScore >= 60 ? 'B' : totalScore >= 40 ? 'C' : 'LOW';

  // Derive concrete recommended services from actual audit issues
  const issueCategories = new Set((input.auditIssues || []).map((i) => i.category));
  if (issueCategories.has('Technical SEO') || issueCategories.has('Security')) {
    recommendedServices.push('Technical SEO & Indexability Remediation (Canonical, Sitemap, Robots, HTTPS)');
  }
  if (issueCategories.has('On-Page SEO') || issueCategories.has('Content SEO')) {
    recommendedServices.push('Autonomous On-Page Metadata & Content Optimization (Titles, Descriptions, H1)');
  }
  if (issueCategories.has('Structured Data') || issueCategories.has('Local SEO')) {
    recommendedServices.push('Local SEO & Schema.org Rich Snippet Implementation');
  }
  if (issueCategories.has('Performance') || issueCategories.has('Mobile SEO')) {
    recommendedServices.push('Core Web Vitals & Mobile Usability Optimization');
  }
  if (recommendedServices.length === 0) {
    recommendedServices.push('Continuous Autonomous SEO Monitoring & Keyword Growth');
  }

  return {
    version: 'v1.0',
    totalScore,
    priority,
    seoOpportunityPts,
    websiteQualityPts,
    commercialRelevancePts,
    competitionPts,
    completenessPts,
    contactabilityPts,
    reasons,
    evidence,
    recommendedServices,
    missingInfo,
    weightsUsed: weights,
  };
}
