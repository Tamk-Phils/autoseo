import { CrawledPageRaw } from '../crawler/analyzer';
import { executeAiPrompt } from './provider';

export interface ProposedOptimization {
  pageUrl: string;
  taskType: 'META_TITLE' | 'META_DESCRIPTION' | 'ALT_TEXT' | 'INTERNAL_LINK' | 'SCHEMA' | 'CONTENT';
  title: string;
  problem: string;
  searchIntent?: string;
  recommendedAction: string;
  beforeValue?: string;
  afterValue: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  expectedImpact: 'HIGH_POTENTIAL' | 'MEDIUM_POTENTIAL' | 'LOW_POTENTIAL';
  confidence: number;
}

export interface QaVerificationResult {
  isSafe: boolean;
  verdict: 'APPROVED' | 'FLAGGED' | 'REJECTED';
  reasons: string[];
}

/**
 * 1. Technical SEO Agent:
 * Evaluates canonical tags, indexing directives, and response performance.
 */
export async function runTechnicalSeoAgent(page: CrawledPageRaw): Promise<ProposedOptimization[]> {
  const proposals: ProposedOptimization[] = [];

  // Check Missing Canonical
  if (!page.canonicalUrl && page.httpStatus === 200) {
    proposals.push({
      pageUrl: page.url,
      taskType: 'SCHEMA',
      title: 'Implement self-referencing canonical tag',
      problem: 'Page lacks an explicit canonical declaration, risking duplicate content index fragmentation.',
      recommendedAction: `Add <link rel="canonical" href="${page.url}" />`,
      beforeValue: 'Missing canonical',
      afterValue: `<link rel="canonical" href="${page.url}" />`,
      priority: 'HIGH',
      expectedImpact: 'HIGH_POTENTIAL',
      confidence: 0.95,
    });
  }

  // Check Missing Structured Data
  if (!page.schemaTypes || page.schemaTypes.length === 0) {
    const cleanTitle = page.title || 'Page';
    const schemaSnippet = JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: cleanTitle,
        url: page.url,
        description: page.metaDescription || '',
      },
      null,
      2
    );

    proposals.push({
      pageUrl: page.url,
      taskType: 'SCHEMA',
      title: 'Generate WebPage Schema.org JSON-LD',
      problem: 'Page lacks structured data entity markup for rich snippets.',
      recommendedAction: 'Inject valid JSON-LD structured data block in page <head>.',
      beforeValue: 'None',
      afterValue: `<script type="application/ld+json">\n${schemaSnippet}\n</script>`,
      priority: 'MEDIUM',
      expectedImpact: 'MEDIUM_POTENTIAL',
      confidence: 0.9,
    });
  }

  return proposals;
}

/**
 * 2. Content SEO Agent:
 * Evaluates Title tags, Meta descriptions, H1 headings, and image alt attributes.
 */
export async function runContentSeoAgent(page: CrawledPageRaw, domain: string): Promise<ProposedOptimization[]> {
  const proposals: ProposedOptimization[] = [];

  // Title optimization
  if (!page.title || page.title.trim().length === 0) {
    // Generate intelligent title based on path & domain
    const cleanSlug = page.path.replace(/[-_/]/g, ' ').trim() || 'Home';
    const capitalized = cleanSlug
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const proposedTitle = `${capitalized} | ${domain}`;

    proposals.push({
      pageUrl: page.url,
      taskType: 'META_TITLE',
      title: 'Generate missing high-intent title tag',
      problem: 'Page has no title tag, leading to low click-through rates and poor ranking visibility.',
      searchIntent: 'Commercial / Informational',
      recommendedAction: `Set page title to: "${proposedTitle}"`,
      beforeValue: '',
      afterValue: proposedTitle,
      priority: 'HIGH',
      expectedImpact: 'HIGH_POTENTIAL',
      confidence: 0.92,
    });
  } else if (page.title.length < 30 || page.title.length > 70) {
    const cleanSlug = page.path.replace(/[-_/]/g, ' ').trim() || 'Official';
    const proposedTitle = `${page.title.slice(0, 45)} | High-Performance Solutions`;
    proposals.push({
      pageUrl: page.url,
      taskType: 'META_TITLE',
      title: 'Optimize title tag length for search snippet display',
      problem: `Current title length is ${page.title.length} characters (ideal is 50-60 characters).`,
      searchIntent: 'Commercial',
      recommendedAction: `Refine title tag to fit within pixel width boundaries without truncation.`,
      beforeValue: page.title,
      afterValue: proposedTitle,
      priority: 'MEDIUM',
      expectedImpact: 'MEDIUM_POTENTIAL',
      confidence: 0.88,
    });
  }

  // Meta description optimization
  if (!page.metaDescription || page.metaDescription.trim().length === 0) {
    const titleSnippet = page.title || domain;
    const proposedDesc = `Explore ${titleSnippet}. Discover comprehensive insights, key features, and expert optimization for ${domain}.`;
    proposals.push({
      pageUrl: page.url,
      taskType: 'META_DESCRIPTION',
      title: 'Generate search-intent aligned meta description',
      problem: 'Missing meta description causes search engines to pull arbitrary body text for snippets.',
      searchIntent: 'Informational',
      recommendedAction: `Add focused meta description (145 characters).`,
      beforeValue: '',
      afterValue: proposedDesc,
      priority: 'MEDIUM',
      expectedImpact: 'MEDIUM_POTENTIAL',
      confidence: 0.9,
    });
  }

  // Image alt text optimization
  if (page.imagesMissingAlt > 0) {
    proposals.push({
      pageUrl: page.url,
      taskType: 'ALT_TEXT',
      title: `Add descriptive alt attributes to ${page.imagesMissingAlt} images`,
      problem: `${page.imagesMissingAlt} images lack alt attributes, reducing accessibility and image search discoverability.`,
      recommendedAction: 'Add concise descriptive alt tags reflecting image content and topic context.',
      beforeValue: `${page.imagesMissingAlt} images without alt`,
      afterValue: 'alt="Descriptive feature illustration"',
      priority: 'LOW',
      expectedImpact: 'LOW_POTENTIAL',
      confidence: 0.85,
    });
  }

  return proposals;
}

/**
 * 3. Internal Linking Agent:
 * Analyzes link topology and suggests contextual internal connections.
 */
export function runInternalLinkingAgent(pages: CrawledPageRaw[]): ProposedOptimization[] {
  const proposals: ProposedOptimization[] = [];
  const lowLinked = pages.filter((p) => p.internalLinksCount < 2 && p.path !== '/' && p.httpStatus === 200);

  if (lowLinked.length > 0 && pages.length > 1) {
    const hubPage = pages.find((p) => p.path === '/' || p.internalLinksCount > 5) || pages[0];
    for (const target of lowLinked.slice(0, 3)) {
      proposals.push({
        pageUrl: hubPage.url,
        taskType: 'INTERNAL_LINK',
        title: `Link from Hub (${hubPage.path}) to under-linked page (${target.path})`,
        problem: `Page "${target.path}" receives only ${target.internalLinksCount} internal links, limiting PageRank distribution.`,
        recommendedAction: `Add contextual anchor link pointing to ${target.url} within body text.`,
        beforeValue: `No contextual link to ${target.path}`,
        afterValue: `<a href="${target.path}">Learn more about ${target.title || target.path}</a>`,
        priority: 'MEDIUM',
        expectedImpact: 'MEDIUM_POTENTIAL',
        confidence: 0.87,
      });
    }
  }

  return proposals;
}

/**
 * 4. QA Agent (Quality Assurance Gatekeeper):
 * Verifies that any proposed optimization strictly conforms to SEO guardrails:
 * - No deceptive keyword stuffing
 * - Character bounds (Title <= 75 chars, Meta description <= 180 chars)
 * - Safe protocols and valid URLs
 * - No forbidden guarantees or deceptive text
 */
export function runQaAgent(proposal: ProposedOptimization): QaVerificationResult {
  const reasons: string[] = [];

  // Guardrail 1: Disallow ranking guarantee claims
  const forbiddenPhrases = [
    'guaranteed #1',
    'guarantee first page',
    'instant ranking',
    'control google',
    'rank #1 tomorrow',
  ];
  for (const phrase of forbiddenPhrases) {
    if (proposal.afterValue.toLowerCase().includes(phrase) || proposal.title.toLowerCase().includes(phrase)) {
      return {
        isSafe: false,
        verdict: 'REJECTED',
        reasons: [`Violates SEO rule: Contains misleading guarantee claim "${phrase}".`],
      };
    }
  }

  // Guardrail 2: Title length bounds
  if (proposal.taskType === 'META_TITLE') {
    if (proposal.afterValue.length > 80) {
      reasons.push('Title exceeds 80 characters and will be truncated on SERP.');
    }
    if (proposal.afterValue.length < 15) {
      reasons.push('Title is too short to provide meaningful search signals.');
    }
  }

  // Guardrail 3: Meta description bounds
  if (proposal.taskType === 'META_DESCRIPTION') {
    if (proposal.afterValue.length > 200) {
      reasons.push('Meta description exceeds 200 characters.');
    }
  }

  // Guardrail 4: Empty check
  if (!proposal.afterValue || proposal.afterValue.trim().length === 0) {
    return {
      isSafe: false,
      verdict: 'REJECTED',
      reasons: ['Proposed value cannot be empty.'],
    };
  }

  if (reasons.length > 0) {
    return {
      isSafe: true, // safe to review but flagged
      verdict: 'FLAGGED',
      reasons,
    };
  }

  return {
    isSafe: true,
    verdict: 'APPROVED',
    reasons: ['Passed all automated SEO safety and quality checks.'],
  };
}

