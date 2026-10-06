export interface DiscoveredIssue {
  category: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NOTICE';
  whyItMatters: string;
  evidence: string;
  solution: string;
  estimatedImpact: 'HIGH' | 'MEDIUM' | 'LOW';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  affectedUrls: string[];
}

export interface CrawledPageRaw {
  id?: string;
  url: string;
  path: string;
  httpStatus: number;
  isIndexable: boolean;
  canonicalUrl?: string | null;
  title?: string | null;
  metaDescription?: string | null;
  h1?: string | null;
  h2Tags?: string[];
  h3Tags?: string[];
  wordCount: number;
  imagesTotal: number;
  imagesMissingAlt: number;
  internalLinksCount: number;
  externalLinksCount: number;
  schemaTypes: string[];
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  responseTimeMs: number;
}

/**
 * Inspects crawled pages and generates granular, actionable SEO audit issues.
 */
export function analyzeCrawledPages(pages: CrawledPageRaw[]): DiscoveredIssue[] {
  const issues: DiscoveredIssue[] = [];

  // 1. Broken / Error Pages (4xx, 5xx)
  const brokenPages = pages.filter((p) => p.httpStatus >= 400);
  if (brokenPages.length > 0) {
    issues.push({
      category: 'Technical SEO',
      title: `${brokenPages.length} pages return client/server error codes (${brokenPages[0].httpStatus})`,
      severity: 'CRITICAL',
      whyItMatters: 'Search engines crawl budget is wasted and visitors encounter broken user journeys, leading to index de-ranking.',
      evidence: brokenPages.slice(0, 5).map((p) => `${p.url} (${p.httpStatus})`).join(', ') + (brokenPages.length > 5 ? ' ...' : ''),
      solution: 'Configure 301 redirects for removed pages or restore missing content to return 200 OK.',
      estimatedImpact: 'HIGH',
      difficulty: 'MEDIUM',
      affectedUrls: brokenPages.map((p) => p.url),
    });
  }

  // 2. Missing Title Tags
  const missingTitlePages = pages.filter((p) => !p.title || p.title.trim().length === 0);
  if (missingTitlePages.length > 0) {
    issues.push({
      category: 'On-Page SEO',
      title: `${missingTitlePages.length} pages are missing a <title> tag`,
      severity: 'CRITICAL',
      whyItMatters: 'Title tags are the single strongest on-page ranking and click-through signal in search engines.',
      evidence: missingTitlePages.slice(0, 5).map((p) => p.url).join(', '),
      solution: 'Craft compelling, unique title tags (50-60 characters) matching user search intent for each page.',
      estimatedImpact: 'HIGH',
      difficulty: 'EASY',
      affectedUrls: missingTitlePages.map((p) => p.url),
    });
  }

  // 3. Duplicate Titles
  const titleMap: Record<string, string[]> = {};
  pages.forEach((p) => {
    if (p.title && p.title.trim().length > 0) {
      const clean = p.title.trim();
      titleMap[clean] = titleMap[clean] || [];
      titleMap[clean].push(p.url);
    }
  });
  const duplicateTitles = Object.entries(titleMap).filter(([_, urls]) => urls.length > 1);
  if (duplicateTitles.length > 0) {
    const affectedUrls = duplicateTitles.flatMap(([_, urls]) => urls);
    issues.push({
      category: 'On-Page SEO',
      title: `${affectedUrls.length} pages share duplicate title tags`,
      severity: 'HIGH',
      whyItMatters: 'Search engines struggle to discern which page best matches specific queries, causing keyword cannibalization.',
      evidence: duplicateTitles.slice(0, 3).map(([title, urls]) => `"${title}" on ${urls.length} pages`).join('; '),
      solution: 'Differentiate titles by targeting specific secondary keywords and unique value propositions.',
      estimatedImpact: 'HIGH',
      difficulty: 'EASY',
      affectedUrls,
    });
  }

  // 4. Missing Meta Description
  const missingDescPages = pages.filter((p) => !p.metaDescription || p.metaDescription.trim().length === 0);
  if (missingDescPages.length > 0) {
    issues.push({
      category: 'On-Page SEO',
      title: `${missingDescPages.length} pages lack a meta description`,
      severity: 'MEDIUM',
      whyItMatters: 'Without an explicit meta description, search engines auto-generate snippet text which often results in lower organic CTR.',
      evidence: missingDescPages.slice(0, 5).map((p) => p.url).join(', '),
      solution: 'Write targeted meta descriptions (130-160 characters) summarizing the value proposition and incorporating target keywords.',
      estimatedImpact: 'MEDIUM',
      difficulty: 'EASY',
      affectedUrls: missingDescPages.map((p) => p.url),
    });
  }

  // 5. Missing H1 or Multiple H1 Tags
  const missingH1Pages = pages.filter((p) => !p.h1 || p.h1.trim().length === 0);
  if (missingH1Pages.length > 0) {
    issues.push({
      category: 'Content',
      title: `${missingH1Pages.length} pages are missing an H1 heading`,
      severity: 'HIGH',
      whyItMatters: 'The H1 tag clarifies the primary topical subject of the page to both users and crawling algorithms.',
      evidence: missingH1Pages.slice(0, 5).map((p) => p.url).join(', '),
      solution: 'Ensure every indexable page has exactly one distinct H1 tag reflecting the core topic.',
      estimatedImpact: 'HIGH',
      difficulty: 'EASY',
      affectedUrls: missingH1Pages.map((p) => p.url),
    });
  }

  // 6. Missing Canonical URLs
  const missingCanonicalPages = pages.filter((p) => !p.canonicalUrl);
  if (missingCanonicalPages.length > 0) {
    issues.push({
      category: 'Technical SEO',
      title: `${missingCanonicalPages.length} pages lack a canonical tag`,
      severity: 'HIGH',
      whyItMatters: 'Canonical URLs prevent duplicate content penalties from query parameters, trailing slashes, or syndicated pages.',
      evidence: missingCanonicalPages.slice(0, 5).map((p) => p.url).join(', '),
      solution: 'Add a self-referencing <link rel="canonical" href="..."> on every primary URL.',
      estimatedImpact: 'HIGH',
      difficulty: 'EASY',
      affectedUrls: missingCanonicalPages.map((p) => p.url),
    });
  }

  // 7. Images Missing Alt Text
  const missingAltPages = pages.filter((p) => p.imagesMissingAlt > 0);
  if (missingAltPages.length > 0) {
    const totalMissing = missingAltPages.reduce((acc, p) => acc + p.imagesMissingAlt, 0);
    issues.push({
      category: 'Images',
      title: `${totalMissing} images missing descriptive alt text across ${missingAltPages.length} pages`,
      severity: 'MEDIUM',
      whyItMatters: 'Alt text provides contextual accessibility for screen readers and indexes images for Google Image Search.',
      evidence: missingAltPages.slice(0, 3).map((p) => `${p.path}: ${p.imagesMissingAlt} missing`).join(', '),
      solution: 'Add succinct, descriptive alt attributes conveying the content or purpose of each image.',
      estimatedImpact: 'MEDIUM',
      difficulty: 'EASY',
      affectedUrls: missingAltPages.map((p) => p.url),
    });
  }

  // 8. Thin Content Pages (< 250 words)
  const thinPages = pages.filter((p) => p.wordCount < 250 && p.httpStatus === 200);
  if (thinPages.length > 0) {
    issues.push({
      category: 'Content',
      title: `${thinPages.length} pages detected with thin content (< 250 words)`,
      severity: 'MEDIUM',
      whyItMatters: 'Pages with sparse textual content struggle to rank for competitive long-tail search queries.',
      evidence: thinPages.slice(0, 4).map((p) => `${p.path} (${p.wordCount} words)`).join(', '),
      solution: 'Expand pages with comprehensive analysis, FAQs, examples, and structured answers to user intent.',
      estimatedImpact: 'MEDIUM',
      difficulty: 'MEDIUM',
      affectedUrls: thinPages.map((p) => p.url),
    });
  }

  // 9. Structured Data Coverage
  const missingSchemaPages = pages.filter((p) => !p.schemaTypes || p.schemaTypes.length === 0);
  if (missingSchemaPages.length > 0 && pages.length > 0) {
    issues.push({
      category: 'Structured Data',
      title: `${missingSchemaPages.length} pages lack JSON-LD structured data`,
      severity: 'LOW',
      whyItMatters: 'Structured data enables rich search snippets, breadcrumbs, article previews, and helps Google AI understand entities.',
      evidence: missingSchemaPages.slice(0, 5).map((p) => p.url).join(', '),
      solution: 'Inject Schema.org JSON-LD (e.g. WebSite, Organization, Article, BreadcrumbList) into header.',
      estimatedImpact: 'MEDIUM',
      difficulty: 'EASY',
      affectedUrls: missingSchemaPages.map((p) => p.url),
    });
  }

  // 10. Slow Page Response Times (> 1200ms)
  const slowPages = pages.filter((p) => p.responseTimeMs > 1200);
  if (slowPages.length > 0) {
    issues.push({
      category: 'Performance',
      title: `${slowPages.length} pages have high server response times (> 1.2s)`,
      severity: 'MEDIUM',
      whyItMatters: 'Slow server response times harm Core Web Vitals (TTFB, LCP) and can reduce crawl rate allocated by Googlebot.',
      evidence: slowPages.slice(0, 4).map((p) => `${p.path} (${p.responseTimeMs}ms)`).join(', '),
      solution: 'Enable server-side caching, optimize database queries, or use an edge CDN.',
      estimatedImpact: 'MEDIUM',
      difficulty: 'HARD',
      affectedUrls: slowPages.map((p) => p.url),
    });
  }

  // 11. Low Internal Linking / Potential Orphans
  const isolatedPages = pages.filter((p) => p.internalLinksCount === 0 && p.httpStatus === 200 && p.path !== '/');
  if (isolatedPages.length > 0) {
    issues.push({
      category: 'Internal Linking',
      title: `${isolatedPages.length} pages have zero internal links (orphan risk)`,
      severity: 'HIGH',
      whyItMatters: 'Pages with zero internal links receive negligible internal PageRank and are difficult for search engines to index.',
      evidence: isolatedPages.slice(0, 5).map((p) => p.url).join(', '),
      solution: 'Add contextual contextual in-content links from related parent category or high-authority blog articles.',
      estimatedImpact: 'HIGH',
      difficulty: 'MEDIUM',
      affectedUrls: isolatedPages.map((p) => p.url),
    });
  }

  return issues;
}

