import * as cheerio from 'cheerio';
import { safePublicFetch } from './ssrf';
import {
  runNativePerformanceAndVitalsAudit,
  NativeWebVitalsReport,
} from './performanceEngine';

export interface SeoAuditIssueItem {
  category:
    | 'Technical SEO'
    | 'On-Page SEO'
    | 'Performance'
    | 'Mobile SEO'
    | 'Local SEO'
    | 'Content SEO'
    | 'Internal Linking'
    | 'Structured Data'
    | 'Security'
    | 'Accessibility';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  evidence: string;
  recommendation: string;
}

export interface LeadSeoAuditResult {
  url: string;
  finalUrl: string;
  scoringVersion: string;
  seoScore: number;
  technicalScore: number;
  onPageScore: number;
  performanceScore: number;
  mobileScore: number;
  structuredDataScore: number;
  localSeoScore: number;
  securityScore: number;
  discoveredEmail: string | null;
  discoveredPhone: string | null;
  pageSpeedData: NativeWebVitalsReport;
  measuredFacts: string[];
  inferredInsights: string[];
  unavailableData: string[];
  issues: SeoAuditIssueItem[];
  rawEvidence: {
    httpStatus: number;
    isHttps: boolean;
    ttfbMs: number;
    responseTimeMs: number;
    htmlSizeBytes: number;
    domNodesCount: number;
    title: string | null;
    titleLength: number;
    metaDescription: string | null;
    metaDescriptionLength: number;
    h1Count: number;
    h1Text: string | null;
    h2Count: number;
    canonicalUrl: string | null;
    robotsMeta: string | null;
    hasViewport: boolean;
    hasRobotsTxt: boolean;
    hasSitemapXml: boolean;
    schemaTypes: string[];
    hasOpenGraph: boolean;
    wordCount: number;
    internalLinksCount: number;
    externalLinksCount: number;
    imagesTotal: number;
    imagesMissingAlt: number;
  };
}

/**
 * Runs a 100% in-house, SSRF-safe, deterministic, evidence-based SEO & Web Vitals audit
 * on a prospect's public website — zero third-party PageSpeed APIs required.
 */
export async function runLeadSeoAudit(
  websiteUrl: string,
  context?: { city?: string | null; industry?: string | null; runPageSpeed?: boolean }
): Promise<LeadSeoAuditResult> {
  const fetchRes = await safePublicFetch(websiteUrl, { timeoutMs: 10000, maxBytes: 1.5 * 1024 * 1024 });
  if (!fetchRes.ok || !fetchRes.body) {
    throw new Error(fetchRes.error || `Website returned HTTP ${fetchRes.status}`);
  }

  const finalUrlObj = new URL(fetchRes.finalUrl);
  const origin = finalUrlObj.origin;
  const isHttps = finalUrlObj.protocol === 'https:';

  // Parallel check for robots.txt and sitemap.xml via SSRF-safe fetcher
  const [robotsRes, sitemapRes] = await Promise.all([
    safePublicFetch(`${origin}/robots.txt`, { method: 'GET', timeoutMs: 4000, maxBytes: 64 * 1024 }),
    safePublicFetch(`${origin}/sitemap.xml`, { method: 'HEAD', timeoutMs: 4000 }),
  ]);

  const hasRobotsTxt = robotsRes.ok && robotsRes.status === 200 && robotsRes.body.length > 5;
  const hasSitemapXml =
    (sitemapRes.ok && sitemapRes.status === 200) ||
    (hasRobotsTxt && /sitemap:/i.test(robotsRes.body));

  const $ = cheerio.load(fetchRes.body);

  // Run our in-house Native Performance, Web Vitals & Accessibility Engine BEFORE mutating DOM
  const nativePerf = runNativePerformanceAndVitalsAudit(fetchRes, $);

  const title = $('title').first().text().trim() || null;
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || null;
  const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim() || null;
  const robotsMeta = $('meta[name="robots"]').attr('content')?.trim() || null;
  const hasViewport = Boolean($('meta[name="viewport"]').attr('content'));
  const hasOpenGraph = Boolean($('meta[property="og:title"]').attr('content'));

  const h1Elements = $('h1');
  const h1Count = h1Elements.length;
  const h1Text = h1Elements.first().text().trim() || null;
  const h2Count = $('h2').length;

  // Schema.org JSON-LD extraction
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() || '{}');
      const items = Array.isArray(parsed) ? parsed : parsed['@graph'] ? parsed['@graph'] : [parsed];
      for (const item of items) {
        if (item?.['@type']) {
          const t = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
          schemaTypes.push(...t.map(String));
        }
      }
    } catch {
      // Malformed JSON-LD
    }
  });

  // Links & public contact channels
  let internalLinksCount = 0;
  let externalLinksCount = 0;
  let discoveredEmail: string | null = null;
  let discoveredPhone: string | null = null;

  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    if (href.toLowerCase().startsWith('mailto:')) {
      if (!discoveredEmail) {
        const candidate = href.slice(7).split('?')[0].trim();
        if (candidate.includes('@')) discoveredEmail = candidate;
      }
      return;
    }
    if (href.toLowerCase().startsWith('tel:')) {
      if (!discoveredPhone) {
        discoveredPhone = href.slice(4).trim();
      }
      return;
    }
    try {
      const target = new URL(href, fetchRes.finalUrl);
      if (target.hostname === finalUrlObj.hostname) internalLinksCount++;
      else externalLinksCount++;
    } catch {
      internalLinksCount++;
    }
  });

  let imagesTotal = 0;
  let imagesMissingAlt = 0;
  $('img').each((_, el) => {
    imagesTotal++;
    const alt = $(el).attr('alt');
    if (!alt || !alt.trim()) imagesMissingAlt++;
  });

  // Visible text word count
  $('script, style, noscript').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText ? bodyText.split(' ').filter(Boolean).length : 0;

  if (!discoveredEmail) {
    const emailMatch = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch && !/example\.com|sentry\.io|wixpress/i.test(emailMatch[0])) {
      discoveredEmail = emailMatch[0];
    }
  }

  // =========================================================================
  // DETERMINISTIC, VERSIONED SCORING (v1.0 — 100% Native AutoSEO Engine)
  // =========================================================================
  const issues: SeoAuditIssueItem[] = [...nativePerf.findings];
  const measuredFacts: string[] = [];
  const inferredInsights: string[] = [];

  measuredFacts.push(
    `HTTP ${fetchRes.status} | TTFB: ${fetchRes.ttfbMs}ms | Total load: ${fetchRes.responseTimeMs}ms | Size: ${(
      fetchRes.byteLength / 1024
    ).toFixed(1)}KB | DOM nodes: ${nativePerf.domNodesCount} (${isHttps ? 'HTTPS' : 'HTTP'}).`
  );
  measuredFacts.push(
    `Native Web Vitals Lab: Perf ${nativePerf.performanceScore}/100, Accessibility ${nativePerf.accessibilityScore}/100, Est. LCP ${nativePerf.estimatedLcpMs}ms, Est. CLS risk ${nativePerf.estimatedClsRisk}, Render-blocking scripts: ${nativePerf.renderBlockingScripts}.`
  );
  measuredFacts.push(
    `Homepage contains ${wordCount} words, ${internalLinksCount} internal links, and ${imagesTotal} images (${imagesMissingAlt} missing alt text).`
  );
  if (title) measuredFacts.push(`Title tag present (${title.length} chars): "${title.slice(0, 70)}".`);
  else measuredFacts.push('Title tag is completely missing.');
  if (metaDescription) measuredFacts.push(`Meta description present (${metaDescription.length} chars).`);
  else measuredFacts.push('Meta description is missing.');
  measuredFacts.push(
    `robots.txt: ${hasRobotsTxt ? 'Found' : 'Missing'} | sitemap.xml: ${hasSitemapXml ? 'Found' : 'Missing'} | Schema.org types: ${
      schemaTypes.length > 0 ? schemaTypes.join(', ') : 'None'
    }.`
  );

  // 1. Technical SEO (100)
  let technicalScore = 100;
  if (!canonicalUrl) {
    technicalScore -= 25;
    issues.push({
      category: 'Technical SEO',
      severity: 'HIGH',
      title: 'Missing Canonical Tag',
      evidence: 'No <link rel="canonical"> element detected on homepage.',
      recommendation: 'Add a self-referencing canonical tag to prevent duplicate URL indexation.',
    });
  }
  if (!hasRobotsTxt) {
    technicalScore -= 20;
    issues.push({
      category: 'Technical SEO',
      severity: 'MEDIUM',
      title: 'Missing robots.txt',
      evidence: `${origin}/robots.txt returned HTTP ${robotsRes.status || 'unreachable'}.`,
      recommendation: 'Publish a valid robots.txt file referencing your XML sitemap.',
    });
  }
  if (!hasSitemapXml) {
    technicalScore -= 25;
    issues.push({
      category: 'Technical SEO',
      severity: 'HIGH',
      title: 'Missing XML Sitemap',
      evidence: `${origin}/sitemap.xml was not found and not declared in robots.txt.`,
      recommendation: 'Generate and submit an XML sitemap to accelerate search engine discovery.',
    });
  }
  if (robotsMeta && /noindex/i.test(robotsMeta)) {
    technicalScore -= 40;
    issues.push({
      category: 'Technical SEO',
      severity: 'CRITICAL',
      title: 'Homepage Marked noindex',
      evidence: `Meta robots directive contains "${robotsMeta}".`,
      recommendation: 'Remove noindex from the primary landing page if organic traffic is desired.',
    });
  }
  technicalScore = Math.max(0, technicalScore);

  // 2. On-Page SEO (100)
  let onPageScore = 100;
  if (!title) {
    onPageScore -= 30;
    issues.push({
      category: 'On-Page SEO',
      severity: 'CRITICAL',
      title: 'Missing Page Title Tag',
      evidence: 'No <title> tag detected in document <head>.',
      recommendation: 'Add a unique 45–60 character title targeting core services and location.',
    });
  } else if (title.length < 25 || title.length > 68) {
    onPageScore -= 15;
    issues.push({
      category: 'On-Page SEO',
      severity: 'MEDIUM',
      title: 'Suboptimal Title Tag Length',
      evidence: `Title tag is ${title.length} characters ("${title.slice(0, 60)}").`,
      recommendation: 'Optimize title length to 35–60 characters to avoid SERP truncation and improve CTR.',
    });
  }
  if (!metaDescription) {
    onPageScore -= 25;
    issues.push({
      category: 'On-Page SEO',
      severity: 'HIGH',
      title: 'Missing Meta Description',
      evidence: 'No <meta name="description"> tag found.',
      recommendation: 'Write a compelling 120–155 character meta description with a clear value proposition.',
    });
  } else if (metaDescription.length < 80 || metaDescription.length > 165) {
    onPageScore -= 10;
    issues.push({
      category: 'On-Page SEO',
      severity: 'LOW',
      title: 'Meta Description Length Outside Optimal Range',
      evidence: `Meta description is ${metaDescription.length} characters.`,
      recommendation: 'Refine meta description to 120–155 characters for optimal search snippet display.',
    });
  }
  if (h1Count === 0) {
    onPageScore -= 20;
    issues.push({
      category: 'On-Page SEO',
      severity: 'HIGH',
      title: 'Missing H1 Heading',
      evidence: 'No <h1> element found on homepage.',
      recommendation: 'Add a single descriptive H1 heading aligned with primary customer search intent.',
    });
  } else if (h1Count > 1) {
    onPageScore -= 10;
    issues.push({
      category: 'On-Page SEO',
      severity: 'LOW',
      title: 'Multiple H1 Headings Detected',
      evidence: `Found ${h1Count} H1 tags on the homepage.`,
      recommendation: 'Consolidate to a single primary H1 and use H2/H3 for subsections.',
    });
  }
  if (wordCount < 250) {
    onPageScore -= 15;
    issues.push({
      category: 'Content SEO',
      severity: 'MEDIUM',
      title: 'Thin Homepage Content',
      evidence: `Only ${wordCount} visible words detected on homepage.`,
      recommendation: 'Expand service descriptions, FAQs, and local relevance copy to 400+ words.',
    });
  }
  if (imagesTotal > 0 && imagesMissingAlt > 0) {
    onPageScore -= Math.min(15, Math.round((imagesMissingAlt / imagesTotal) * 20));
    issues.push({
      category: 'Accessibility',
      severity: 'MEDIUM',
      title: 'Images Missing Alt Attributes',
      evidence: `${imagesMissingAlt} of ${imagesTotal} images lack alt text.`,
      recommendation: 'Add descriptive alt attributes to improve accessibility and image search visibility.',
    });
  }
  onPageScore = Math.max(0, onPageScore);

  // 3. Performance (100) — directly from our in-house Native Performance Engine
  const performanceScore = nativePerf.performanceScore;

  // 4. Mobile SEO (100)
  const mobileScore = hasViewport ? 90 : 35;
  if (!hasViewport) {
    issues.push({
      category: 'Mobile SEO',
      severity: 'HIGH',
      title: 'Missing Mobile Viewport Meta Tag',
      evidence: 'No <meta name="viewport"> tag found.',
      recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile-first indexing.',
    });
  }

  // 5. Structured Data (100)
  const structuredDataScore = schemaTypes.length > 0 ? 90 : 20;
  if (schemaTypes.length === 0) {
    issues.push({
      category: 'Structured Data',
      severity: 'HIGH',
      title: 'No Schema.org Structured Data Found',
      evidence: 'Zero application/ld+json blocks detected on homepage.',
      recommendation: 'Implement LocalBusiness / Organization JSON-LD schema for rich search snippets.',
    });
  }

  // 6. Local SEO (100)
  let localSeoScore = 70;
  const hasLocalSchema = schemaTypes.some((t) => /LocalBusiness|Dentist|Restaurant|AutoRepair|Store|Clinic|Attorney/i.test(t));
  const mentionsCity = context?.city ? bodyText.toLowerCase().includes(context.city.toLowerCase()) : true;
  if (hasLocalSchema) localSeoScore += 25;
  if (!mentionsCity && context?.city) {
    localSeoScore -= 25;
    issues.push({
      category: 'Local SEO',
      severity: 'MEDIUM',
      title: 'Weak Local Location Signals',
      evidence: `Target city "${context.city}" not prominently referenced in homepage copy or title.`,
      recommendation: `Incorporate "${context.city}" naturally into title tags, H1, and LocalBusiness schema.`,
    });
  }
  localSeoScore = Math.max(0, Math.min(100, localSeoScore));

  // 7. Security (100)
  const securityScore = isHttps ? (nativePerf.hasHsts ? 100 : 90) : 25;
  if (!isHttps) {
    issues.push({
      category: 'Security',
      severity: 'CRITICAL',
      title: 'Website Not Serving Over HTTPS',
      evidence: `Final resolved URL uses insecure HTTP: ${fetchRes.finalUrl}`,
      recommendation: 'Install an SSL/TLS certificate and force 301 redirects from HTTP to HTTPS.',
    });
  }

  const seoScore = Math.round(
    technicalScore * 0.22 +
      onPageScore * 0.25 +
      performanceScore * 0.15 +
      mobileScore * 0.1 +
      structuredDataScore * 0.12 +
      localSeoScore * 0.08 +
      securityScore * 0.08
  );

  if (issues.length > 0) {
    inferredInsights.push(
      `Identified ${issues.length} actionable SEO & Web Vitals opportunities (top categories: ${Array.from(
        new Set(issues.slice(0, 4).map((i) => i.category))
      ).join(', ')}).`
    );
  }
  if (!hasOpenGraph) {
    inferredInsights.push('Missing OpenGraph social preview tags may reduce click-through rates when shared.');
  }

  const unavailableData = [
    'Actual organic search traffic volume (requires website owner analytics authorization).',
    'Verified keyword ranking positions and CTR (requires Search Console authorization).',
    'Private backlink toxicity and referring domain history (requires owner-side index access).',
  ];

  return {
    url: websiteUrl,
    finalUrl: fetchRes.finalUrl,
    scoringVersion: 'v1.0',
    seoScore,
    technicalScore,
    onPageScore,
    performanceScore,
    mobileScore,
    structuredDataScore,
    localSeoScore,
    securityScore,
    discoveredEmail,
    discoveredPhone,
    pageSpeedData: nativePerf,
    measuredFacts,
    inferredInsights,
    unavailableData,
    issues,
    rawEvidence: {
      httpStatus: fetchRes.status,
      isHttps,
      ttfbMs: fetchRes.ttfbMs,
      responseTimeMs: fetchRes.responseTimeMs,
      htmlSizeBytes: fetchRes.byteLength,
      domNodesCount: nativePerf.domNodesCount,
      title,
      titleLength: title?.length || 0,
      metaDescription,
      metaDescriptionLength: metaDescription?.length || 0,
      h1Count,
      h1Text,
      h2Count,
      canonicalUrl,
      robotsMeta,
      hasViewport,
      hasRobotsTxt,
      hasSitemapXml,
      schemaTypes,
      hasOpenGraph,
      wordCount,
      internalLinksCount,
      externalLinksCount,
      imagesTotal,
      imagesMissingAlt,
    },
  };
}
