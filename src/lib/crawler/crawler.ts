import * as cheerio from 'cheerio';
import { URL } from 'node:url';
import { validateUrlForSsrf } from '../ssrf';
import { CrawledPageRaw } from './analyzer';

export interface CrawlLogEntry {
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'PAGE';
  message: string;
  url?: string;
}

export interface CrawlOptions {
  startUrl: string;
  maxPages?: number;
  maxDepth?: number;
  userAgent?: string;
  timeoutMs?: number;
  onProgress?: (log: CrawlLogEntry, progressPercent: number) => void;
}

export interface CrawlResult {
  pages: CrawledPageRaw[];
  logs: CrawlLogEntry[];
  robotsFound: boolean;
  sitemapFound: boolean;
  discoveredSitemapUrls: string[];
}

/**
 * Production-ready web crawler with strict SSRF protection, robots.txt and sitemap.xml detection,
 * canonical resolution, and in-depth HTML structure extraction.
 */
export class AutonomousCrawler {
  private visitedUrls = new Set<string>();
  private queue: { url: string; depth: number }[] = [];
  private baseOrigin: string = '';
  private baseHost: string = '';
  private logs: CrawlLogEntry[] = [];
  private maxPages: number;
  private maxDepth: number;
  private userAgent: string;
  private timeoutMs: number;
  private onProgress?: (log: CrawlLogEntry, progressPercent: number) => void;

  constructor(options: CrawlOptions) {
    this.maxPages = options.maxPages || 30;
    this.maxDepth = options.maxDepth || 3;
    this.userAgent = options.userAgent || 'ApexSEO-Bot/1.0 (+https://apexseo.engine/bot)';
    this.timeoutMs = options.timeoutMs || 8000;
    this.onProgress = options.onProgress;
  }

  private addLog(type: CrawlLogEntry['type'], message: string, url?: string, progress = 0) {
    const entry: CrawlLogEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      url,
    };
    this.logs.push(entry);
    if (this.onProgress) {
      this.onProgress(entry, progress);
    }
  }

  public async crawl(targetUrl: string): Promise<CrawlResult> {
    const pages: CrawledPageRaw[] = [];

    // Step 1: SSRF Verification
    const ssrfCheck = await validateUrlForSsrf(targetUrl);
    if (!ssrfCheck.valid) {
      this.addLog('ERROR', `Security check failed: ${ssrfCheck.error}`);
      throw new Error(`SSRF Prevention Block: ${ssrfCheck.error}`);
    }

    const startObj = new URL(targetUrl);
    this.baseOrigin = startObj.origin;
    this.baseHost = startObj.hostname;

    this.addLog('INFO', `Initializing autonomous crawl for ${targetUrl}`);

    // Step 2: Check robots.txt
    let robotsFound = false;
    let sitemapUrlsFromRobots: string[] = [];
    try {
      const robotsUrl = `${this.baseOrigin}/robots.txt`;
      const robotsRes = await fetch(robotsUrl, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(4000),
      });
      if (robotsRes.ok) {
        robotsFound = true;
        const robotsText = await robotsRes.text();
        this.addLog('SUCCESS', `✓ robots.txt discovered (${robotsText.length} bytes)`);

        // Check for sitemap in robots.txt
        const lines = robotsText.split('\n');
        for (const line of lines) {
          const match = line.match(/^Sitemap:\s*(https?:\/\/[^\s]+)/i);
          if (match && match[1]) {
            sitemapUrlsFromRobots.push(match[1]);
          }
        }
      } else {
        this.addLog('WARNING', `robots.txt not found (HTTP ${robotsRes.status})`);
      }
    } catch {
      this.addLog('WARNING', 'robots.txt not accessible or timed out');
    }

    // Step 3: Discover sitemap.xml
    let sitemapFound = false;
    const discoveredSitemapUrls: string[] = [];
    const candidateSitemaps = sitemapUrlsFromRobots.length > 0
      ? sitemapUrlsFromRobots
      : [`${this.baseOrigin}/sitemap.xml`, `${this.baseOrigin}/sitemap_index.xml`];

    for (const smUrl of candidateSitemaps) {
      try {
        const smRes = await fetch(smUrl, {
          headers: { 'User-Agent': this.userAgent },
          signal: AbortSignal.timeout(4000),
        });
        if (smRes.ok) {
          sitemapFound = true;
          this.addLog('SUCCESS', `✓ sitemap.xml discovered at ${smUrl}`);
          const smXml = await smRes.text();
          const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
          let m: RegExpExecArray | null;
          while ((m = locRegex.exec(smXml)) !== null) {
            try {
              const u = new URL(m[1]);
              if (u.hostname === this.baseHost) {
                discoveredSitemapUrls.push(u.href);
              }
            } catch {}
          }
          this.addLog('INFO', `Discovered ${discoveredSitemapUrls.length} pages in sitemap`);
          break;
        }
      } catch {}
    }

    // Initialize crawl queue
    this.queue.push({ url: startObj.href, depth: 0 });

    // Seed queue with first few sitemap URLs if available
    for (const sUrl of discoveredSitemapUrls.slice(0, 15)) {
      if (sUrl !== startObj.href) {
        this.queue.push({ url: sUrl, depth: 1 });
      }
    }

    // Step 4: Crawl loop
    while (this.queue.length > 0 && pages.length < this.maxPages) {
      const current = this.queue.shift()!;
      const normalizedUrl = this.normalizeUrl(current.url);

      if (!normalizedUrl || this.visitedUrls.has(normalizedUrl)) {
        continue;
      }

      this.visitedUrls.add(normalizedUrl);
      const progressPercent = Math.min(95, Math.round((pages.length / this.maxPages) * 100));

      this.addLog('PAGE', `Analyzing: ${new URL(normalizedUrl).pathname || '/'}`, normalizedUrl, progressPercent);

      try {
        const startTime = Date.now();
        const response = await fetch(normalizedUrl, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        const responseTimeMs = Date.now() - startTime;
        const httpStatus = response.status;
        const contentType = response.headers.get('content-type') || '';

        // If not HTML (e.g. image, pdf), skip deep parsing
        if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
          continue;
        }

        const html = await response.text();
        const parsed = this.parsePageHtml(normalizedUrl, html, httpStatus, responseTimeMs);
        pages.push(parsed);

        // Link extraction for crawling further (if within maxDepth)
        if (current.depth < this.maxDepth) {
          const $ = cheerio.load(html);
          $('a[href]').each((_, el) => {
            const rawHref = $(el).attr('href');
            if (rawHref) {
              const resolved = this.resolveLink(rawHref, normalizedUrl);
              if (resolved && !this.visitedUrls.has(resolved)) {
                this.queue.push({ url: resolved, depth: current.depth + 1 });
              }
            }
          });
        }
      } catch (err: any) {
        this.addLog('WARNING', `Failed to crawl ${normalizedUrl}: ${err.message}`, normalizedUrl);
      }
    }

    this.addLog('SUCCESS', `Crawl complete. Analyzed ${pages.length} pages.`, undefined, 100);

    return {
      pages,
      logs: this.logs,
      robotsFound,
      sitemapFound,
      discoveredSitemapUrls,
    };
  }

  private parsePageHtml(pageUrl: string, html: string, httpStatus: number, responseTimeMs: number): CrawledPageRaw {
    const $ = cheerio.load(html);
    const parsedUrl = new URL(pageUrl);
    const path = parsedUrl.pathname + parsedUrl.search;

    // Title tag
    const title = $('title').first().text().trim() || null;

    // Meta description
    const metaDescription =
      $('meta[name="description" i]').attr('content')?.trim() ||
      $('meta[property="og:description" i]').attr('content')?.trim() ||
      null;

    // Headings
    const h1 = $('h1').first().text().trim() || null;
    const h2Tags: string[] = [];
    $('h2').each((_, el) => {
      const t = $(el).text().trim();
      if (t) h2Tags.push(t.substring(0, 150));
    });

    const h3Tags: string[] = [];
    $('h3').each((_, el) => {
      const t = $(el).text().trim();
      if (t) h3Tags.push(t.substring(0, 150));
    });

    // Canonical tag
    const canonicalUrl = $('link[rel="canonical" i]').attr('href')?.trim() || null;

    // Robots meta tag
    const robotsMeta = $('meta[name="robots" i]').attr('content')?.toLowerCase() || '';
    const isIndexable = !robotsMeta.includes('noindex') && httpStatus === 200;

    // OpenGraph & Twitter
    const hasOpenGraph = $('meta[property^="og:"]').length > 0;
    const hasTwitterCard = $('meta[name^="twitter:"]').length > 0;

    // Structured Data JSON-LD
    const schemaTypes: string[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const rawJson = $(el).html();
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (item['@type']) schemaTypes.push(String(item['@type']));
            });
          } else if (parsed['@type']) {
            schemaTypes.push(String(parsed['@type']));
          }
        }
      } catch {}
    });

    // Content text & Word count
    $('script, style, noscript, nav, footer, header').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const words = bodyText ? bodyText.split(' ').filter(Boolean) : [];
    const wordCount = words.length;

    // Images & Alt attributes
    let imagesTotal = 0;
    let imagesMissingAlt = 0;
    $('img').each((_, el) => {
      imagesTotal++;
      const alt = $(el).attr('alt');
      if (!alt || alt.trim().length === 0) {
        imagesMissingAlt++;
      }
    });

    // Internal vs External links
    let internalLinksCount = 0;
    let externalLinksCount = 0;
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const resolved = this.resolveLink(href, pageUrl);
        if (resolved) {
          try {
            const u = new URL(resolved);
            if (u.hostname === this.baseHost) {
              internalLinksCount++;
            } else {
              externalLinksCount++;
            }
          } catch {}
        }
      }
    });

    return {
      url: pageUrl,
      path,
      httpStatus,
      isIndexable,
      canonicalUrl,
      title,
      metaDescription,
      h1,
      h2Tags,
      h3Tags,
      wordCount,
      imagesTotal,
      imagesMissingAlt,
      internalLinksCount,
      externalLinksCount,
      schemaTypes: [...new Set(schemaTypes)],
      hasOpenGraph,
      hasTwitterCard,
      responseTimeMs,
    };
  }

  private resolveLink(href: string, currentUrl: string): string | null {
    try {
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:') || href.startsWith('#')) {
        return null;
      }
      const resolved = new URL(href, currentUrl);
      // Only keep HTTP/HTTPS on same host
      if ((resolved.protocol === 'http:' || resolved.protocol === 'https:') && resolved.hostname === this.baseHost) {
        // Strip fragments
        resolved.hash = '';
        return resolved.href;
      }
      return null;
    } catch {
      return null;
    }
  }

  private normalizeUrl(urlStr: string): string {
    try {
      const parsed = new URL(urlStr);
      parsed.hash = '';
      // Remove trailing slash for root consistency (except plain /)
      if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }
      return parsed.href;
    } catch {
      return urlStr;
    }
  }
}
