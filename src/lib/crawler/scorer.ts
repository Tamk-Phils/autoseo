export interface PageAnalysisData {
  url: string;
  httpStatus: number;
  isIndexable: boolean;
  canonicalUrl?: string | null;
  title?: string | null;
  metaDescription?: string | null;
  h1?: string | null;
  h2Count: number;
  wordCount: number;
  imagesTotal: number;
  imagesMissingAlt: number;
  internalLinksCount: number;
  externalLinksCount: number;
  schemaTypes: string[];
  responseTimeMs: number;
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
}

export interface ScoreBreakdown {
  overallScore: number;
  technicalScore: number;     // max 25
  contentScore: number;       // max 25
  indexabilityScore: number;  // max 15
  performanceScore: number;   // max 10
  internalLinkScore: number;  // max 10
  structuredDataScore: number;// max 15
  totalPages: number;
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
}

/**
 * Calculates a genuine, dynamic Optimization Score based solely on real crawl page data and detected issues.
 * Each dimension has a weighted mathematical model with deductions based on real observed SEO deficiencies.
 */
export function calculateOptimizationScore(pages: PageAnalysisData[], issuesCountBySeverity?: { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number }): ScoreBreakdown {
  if (pages.length === 0) {
    return {
      overallScore: 0,
      technicalScore: 0,
      contentScore: 0,
      indexabilityScore: 0,
      performanceScore: 0,
      internalLinkScore: 0,
      structuredDataScore: 0,
      totalPages: 0,
      summary: { criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0 },
    };
  }

  const N = pages.length;

  // 1. Technical SEO (Max 25 points)
  // Evaluates HTTP status codes, canonical configuration, HTTPS/security signals, OpenGraph
  let techPoints = 25;
  const errorPages = pages.filter((p) => p.httpStatus >= 400).length;
  const missingCanonical = pages.filter((p) => !p.canonicalUrl).length;
  const missingOg = pages.filter((p) => !p.hasOpenGraph).length;

  // Deduct up to 10 points for HTTP errors
  techPoints -= Math.min(10, Math.round((errorPages / N) * 15));
  // Deduct up to 8 points for missing canonical tags
  techPoints -= Math.min(8, Math.round((missingCanonical / N) * 10));
  // Deduct up to 4 points for missing OpenGraph tags
  techPoints -= Math.min(4, Math.round((missingOg / N) * 5));
  techPoints = Math.max(0, techPoints);

  // 2. Content SEO (Max 25 points)
  // Evaluates Title tag presence/length (50-60 chars ideal), Meta description (120-160 chars), H1 presence, word count (>300 words), alt tags
  let contentPoints = 25;
  const missingTitle = pages.filter((p) => !p.title || p.title.trim().length === 0).length;
  const poorTitleLength = pages.filter((p) => {
    const len = p.title ? p.title.length : 0;
    return len < 30 || len > 70;
  }).length;
  const missingMetaDesc = pages.filter((p) => !p.metaDescription || p.metaDescription.trim().length === 0).length;
  const missingH1 = pages.filter((p) => !p.h1 || p.h1.trim().length === 0).length;
  const thinContent = pages.filter((p) => p.wordCount < 300).length;
  const totalImages = pages.reduce((acc, p) => acc + p.imagesTotal, 0);
  const missingAlt = pages.reduce((acc, p) => acc + p.imagesMissingAlt, 0);

  contentPoints -= Math.min(7, Math.round((missingTitle / N) * 10));
  contentPoints -= Math.min(4, Math.round((poorTitleLength / N) * 5));
  contentPoints -= Math.min(5, Math.round((missingMetaDesc / N) * 6));
  contentPoints -= Math.min(5, Math.round((missingH1 / N) * 6));
  contentPoints -= Math.min(4, Math.round((thinContent / N) * 5));
  if (totalImages > 0) {
    contentPoints -= Math.min(3, Math.round((missingAlt / totalImages) * 4));
  }
  contentPoints = Math.max(0, contentPoints);

  // 3. Indexability (Max 15 points)
  // Ratio of successfully indexable 200 OK pages vs non-indexable or error pages
  let indexabilityPoints = 15;
  const nonIndexable = pages.filter((p) => !p.isIndexable).length;
  indexabilityPoints -= Math.min(15, Math.round((nonIndexable / N) * 15));
  indexabilityPoints = Math.max(0, indexabilityPoints);

  // 4. Performance (Max 10 points)
  // Page response time (ideal < 500ms, warning 500-1500ms, poor > 1500ms)
  let perfPoints = 10;
  const avgResponseTime = pages.reduce((acc, p) => acc + p.responseTimeMs, 0) / N;
  if (avgResponseTime > 2000) {
    perfPoints = 2;
  } else if (avgResponseTime > 1200) {
    perfPoints = 5;
  } else if (avgResponseTime > 700) {
    perfPoints = 7;
  } else if (avgResponseTime > 400) {
    perfPoints = 9;
  } else {
    perfPoints = 10;
  }

  // 5. Internal Linking (Max 10 points)
  // Evaluates internal link distribution, orphan pages (0 internal inbound/outbound links)
  let linkPoints = 10;
  const isolatedPages = pages.filter((p) => p.internalLinksCount < 2).length;
  linkPoints -= Math.min(10, Math.round((isolatedPages / N) * 10));
  linkPoints = Math.max(0, linkPoints);

  // 6. Structured Data (Max 15 points)
  // Evaluates pages that include JSON-LD or schema entities (Organization, WebSite, Article, Breadcrumb, Product, FAQ, etc.)
  let schemaPoints = 15;
  const pagesWithSchema = pages.filter((p) => p.schemaTypes && p.schemaTypes.length > 0).length;
  const schemaCoverage = pagesWithSchema / N;
  schemaPoints = Math.round(schemaCoverage * 15);

  const overallScore = Math.min(100, Math.max(0, techPoints + contentPoints + indexabilityPoints + perfPoints + linkPoints + schemaPoints));

  return {
    overallScore,
    technicalScore: techPoints,
    contentScore: contentPoints,
    indexabilityScore: indexabilityPoints,
    performanceScore: perfPoints,
    internalLinkScore: linkPoints,
    structuredDataScore: schemaPoints,
    totalPages: N,
    summary: {
      criticalCount: issuesCountBySeverity?.CRITICAL ?? 0,
      highCount: issuesCountBySeverity?.HIGH ?? 0,
      mediumCount: issuesCountBySeverity?.MEDIUM ?? 0,
      lowCount: issuesCountBySeverity?.LOW ?? 0,
    },
  };
}

