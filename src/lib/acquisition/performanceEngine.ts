import * as cheerio from 'cheerio';
import { SafeFetchResult } from './ssrf';

export interface NativeWebVitalsReport {
  source: 'AUTOSEO_NATIVE_PERF_ENGINE';
  engineVersion: string;
  performanceScore: number;
  accessibilityScore: number;
  ttfbMs: number;
  downloadTimeMs: number;
  htmlSizeBytes: number;
  domNodesCount: number;
  renderBlockingScripts: number;
  renderBlockingStylesheets: number;
  externalScriptOrigins: number;
  imagesTotal: number;
  imagesWithoutDimensions: number;
  imagesWithoutLazyLoading: number;
  modernImageFormatRatio: number;
  hasCompression: boolean;
  hasCacheControl: boolean;
  hasHsts: boolean;
  // Synthetic lab estimates computed deterministically from measured HTTP/DOM telemetry
  estimatedLcpMs: number;
  estimatedClsRisk: number;
  estimatedTbtMs: number;
  findings: Array<{
    category: 'Performance' | 'Accessibility' | 'Security';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    evidence: string;
    recommendation: string;
  }>;
}

/**
 * In-House AutoSEO Performance, Web Vitals & Accessibility Analyzer (Zero Third-Party APIs).
 * Directly inspects real HTTP timing, compression, caching, DOM complexity,
 * render-blocking assets, image layout shift risks, and WCAG accessibility markup.
 */
export function runNativePerformanceAndVitalsAudit(
  fetchRes: SafeFetchResult,
  $: cheerio.CheerioAPI
): NativeWebVitalsReport {
  const findings: NativeWebVitalsReport['findings'] = [];

  const ttfbMs = fetchRes.ttfbMs;
  const downloadTimeMs = Math.max(1, fetchRes.responseTimeMs - ttfbMs);
  const htmlSizeBytes = fetchRes.byteLength;
  const domNodesCount = $('*').length;

  const hasCompression = Boolean(
    fetchRes.headers.contentEncoding &&
      /gzip|br|deflate|zstd/i.test(fetchRes.headers.contentEncoding)
  );
  const hasCacheControl = Boolean(fetchRes.headers.cacheControl);
  const hasHsts = Boolean(fetchRes.headers.strictTransportSecurity);

  // 1. Render-blocking resources in <head>
  let renderBlockingScripts = 0;
  let totalScripts = 0;
  const externalOrigins = new Set<string>();
  let pageOrigin = '';
  try {
    pageOrigin = new URL(fetchRes.finalUrl).origin;
  } catch {}

  $('script[src]').each((_, el) => {
    totalScripts++;
    const src = $(el).attr('src') || '';
    const isAsync = $(el).attr('async') !== undefined;
    const isDefer = $(el).attr('defer') !== undefined;
    const type = ($(el).attr('type') || '').toLowerCase();
    const inHead = $(el).parents('head').length > 0;

    if (inHead && !isAsync && !isDefer && type !== 'module') {
      renderBlockingScripts++;
    }

    try {
      const origin = new URL(src, fetchRes.finalUrl).origin;
      if (origin !== pageOrigin) externalOrigins.add(origin);
    } catch {}
  });

  let renderBlockingStylesheets = 0;
  $('head link[rel="stylesheet"]').each((_, el) => {
    const media = ($(el).attr('media') || '').toLowerCase();
    if (!media || media === 'all' || media === 'screen') {
      renderBlockingStylesheets++;
    }
  });

  // 2. Image optimization & CLS risk
  let imagesTotal = 0;
  let imagesWithoutDimensions = 0;
  let imagesWithoutLazyLoading = 0;
  let modernImages = 0;
  let imagesMissingAlt = 0;

  $('img').each((idx, el) => {
    imagesTotal++;
    const width = $(el).attr('width');
    const height = $(el).attr('height');
    const loading = ($(el).attr('loading') || '').toLowerCase();
    const src = ($(el).attr('src') || $(el).attr('data-src') || '').toLowerCase();
    const alt = $(el).attr('alt');

    if (!width || !height) imagesWithoutDimensions++;
    if (idx >= 2 && loading !== 'lazy') imagesWithoutLazyLoading++;
    if (/\.(webp|avif|svg)(\?|$)/i.test(src)) modernImages++;
    if (!alt || !alt.trim()) imagesMissingAlt++;
  });

  const modernImageFormatRatio =
    imagesTotal > 0 ? Number((modernImages / imagesTotal).toFixed(2)) : 1;

  // 3. Inline JS/CSS payload
  let inlineScriptBytes = 0;
  $('script:not([src])').each((_, el) => {
    inlineScriptBytes += ($(el).html() || '').length;
  });

  // 4. Deterministic Lab Core Web Vitals Estimates (based strictly on measured signals)
  const estimatedLcpMs = Math.round(
    ttfbMs +
      downloadTimeMs +
      renderBlockingScripts * 260 +
      renderBlockingStylesheets * 140 +
      (htmlSizeBytes > 150000 ? 350 : 120) +
      (imagesTotal > 0 && modernImageFormatRatio < 0.3 ? 420 : 150)
  );

  const unsizedRatio = imagesTotal > 0 ? imagesWithoutDimensions / imagesTotal : 0;
  const iframeUnsized = $('iframe:not([width]):not([height])').length;
  const estimatedClsRisk = Number(
    Math.min(0.65, unsizedRatio * 0.22 + iframeUnsized * 0.08).toFixed(3)
  );

  const estimatedTbtMs = Math.round(
    renderBlockingScripts * 120 +
      Math.max(0, totalScripts - 5) * 35 +
      Math.max(0, domNodesCount - 800) * 0.15 +
      (inlineScriptBytes > 50000 ? 180 : 0)
  );

  // 5. Performance Score (0–100)
  let performanceScore = 100;

  if (ttfbMs > 1800) {
    performanceScore -= 25;
    findings.push({
      category: 'Performance',
      severity: 'HIGH',
      title: 'Slow Server Response Time (TTFB)',
      evidence: `Measured Time to First Byte: ${ttfbMs}ms (target < 800ms).`,
      recommendation: 'Enable full-page/edge caching, optimize database queries, or add a CDN.',
    });
  } else if (ttfbMs > 800) {
    performanceScore -= 12;
    findings.push({
      category: 'Performance',
      severity: 'MEDIUM',
      title: 'Elevated Server Response Time (TTFB)',
      evidence: `Measured Time to First Byte: ${ttfbMs}ms.`,
      recommendation: 'Reduce origin latency with HTTP caching headers or edge CDN caching.',
    });
  }

  if (renderBlockingScripts > 0) {
    performanceScore -= Math.min(20, renderBlockingScripts * 6);
    findings.push({
      category: 'Performance',
      severity: renderBlockingScripts >= 3 ? 'HIGH' : 'MEDIUM',
      title: 'Render-Blocking JavaScript in <head>',
      evidence: `${renderBlockingScripts} synchronous <script> tags block initial HTML painting.`,
      recommendation: 'Add defer or async attributes to non-critical scripts in <head>.',
    });
  }

  if (renderBlockingStylesheets > 4) {
    performanceScore -= Math.min(12, (renderBlockingStylesheets - 4) * 3);
    findings.push({
      category: 'Performance',
      severity: 'MEDIUM',
      title: 'Excessive Render-Blocking Stylesheets',
      evidence: `${renderBlockingStylesheets} blocking CSS stylesheets found in <head>.`,
      recommendation: 'Inline critical CSS and bundle/minify secondary stylesheets.',
    });
  }

  if (imagesTotal > 0 && imagesWithoutDimensions > 2) {
    performanceScore -= Math.min(12, Math.round(unsizedRatio * 14));
    findings.push({
      category: 'Performance',
      severity: 'MEDIUM',
      title: 'Layout Shift Risk (Images Missing Width/Height)',
      evidence: `${imagesWithoutDimensions} of ${imagesTotal} images lack explicit width/height attributes (Est. CLS risk: ${estimatedClsRisk}).`,
      recommendation: 'Set explicit width and height attributes or CSS aspect-ratio on all images to prevent CLS.',
    });
  }

  if (domNodesCount > 1500) {
    performanceScore -= 10;
    findings.push({
      category: 'Performance',
      severity: 'MEDIUM',
      title: 'Excessive DOM Size',
      evidence: `Document contains ${domNodesCount} DOM nodes (recommended < 1,500).`,
      recommendation: 'Simplify nested markup and lazy-render offscreen UI sections.',
    });
  }

  if (!hasCompression && htmlSizeBytes > 20000) {
    performanceScore -= 8;
    findings.push({
      category: 'Performance',
      severity: 'MEDIUM',
      title: 'HTML Response Missing Compression',
      evidence: `No gzip/brotli Content-Encoding header on ${(htmlSizeBytes / 1024).toFixed(1)}KB HTML document.`,
      recommendation: 'Enable Brotli or Gzip compression on the web server or CDN.',
    });
  }

  if (externalOrigins.size > 6) {
    performanceScore -= 8;
    findings.push({
      category: 'Performance',
      severity: 'LOW',
      title: 'Heavy Third-Party Script Footprint',
      evidence: `Scripts loaded from ${externalOrigins.size} distinct third-party origins.`,
      recommendation: 'Audit and defer non-essential third-party trackers and widgets.',
    });
  }

  if (!hasHsts && fetchRes.finalUrl.startsWith('https://')) {
    findings.push({
      category: 'Security',
      severity: 'LOW',
      title: 'Missing HSTS Security Header',
      evidence: 'Strict-Transport-Security header not present on HTTPS response.',
      recommendation: 'Add Strict-Transport-Security: max-age=31536000; includeSubDomains.',
    });
  }

  performanceScore = Math.max(5, Math.min(100, performanceScore));

  // 6. Native Accessibility Score (0–100)
  let accessibilityScore = 100;
  const htmlLang = $('html').attr('lang')?.trim();
  if (!htmlLang) {
    accessibilityScore -= 15;
    findings.push({
      category: 'Accessibility',
      severity: 'MEDIUM',
      title: 'Missing HTML lang Attribute',
      evidence: '<html> element does not specify a language (e.g. lang="en").',
      recommendation: 'Add a valid BCP-47 lang attribute to the <html> tag for screen readers.',
    });
  }

  if (imagesTotal > 0 && imagesMissingAlt > 0) {
    accessibilityScore -= Math.min(25, Math.round((imagesMissingAlt / imagesTotal) * 30));
  }

  const hasMainLandmark = $('main, [role="main"]').length > 0;
  if (!hasMainLandmark) {
    accessibilityScore -= 10;
  }

  let emptyLinks = 0;
  $('a[href]').each((_, el) => {
    const text = $(el).text().trim();
    const aria = $(el).attr('aria-label')?.trim() || $(el).attr('title')?.trim();
    const imgAlt = $(el).find('img[alt]').attr('alt')?.trim();
    if (!text && !aria && !imgAlt) emptyLinks++;
  });
  if (emptyLinks > 3) {
    accessibilityScore -= 15;
    findings.push({
      category: 'Accessibility',
      severity: 'LOW',
      title: 'Links Without Accessible Text',
      evidence: `${emptyLinks} anchor links have no visible text or aria-label.`,
      recommendation: 'Add descriptive link text or aria-label attributes for icon-only links.',
    });
  }

  accessibilityScore = Math.max(10, Math.min(100, accessibilityScore));

  return {
    source: 'AUTOSEO_NATIVE_PERF_ENGINE',
    engineVersion: 'v1.0',
    performanceScore,
    accessibilityScore,
    ttfbMs,
    downloadTimeMs,
    htmlSizeBytes,
    domNodesCount,
    renderBlockingScripts,
    renderBlockingStylesheets,
    externalScriptOrigins: externalOrigins.size,
    imagesTotal,
    imagesWithoutDimensions,
    imagesWithoutLazyLoading,
    modernImageFormatRatio,
    hasCompression,
    hasCacheControl,
    hasHsts,
    estimatedLcpMs,
    estimatedClsRisk,
    estimatedTbtMs,
    findings,
  };
}
