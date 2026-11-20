import * as cheerio from 'cheerio';
import { safePublicFetch } from './ssrf';

export interface DiscoveredBusiness {
  businessName: string;
  normalizedName: string;
  websiteUrl: string | null;
  normalizedDomain: string | null;
  websiteStatus: 'VERIFIED' | 'UNVERIFIED' | 'NO_WEBSITE_VERIFIED' | 'UNREACHABLE';
  country: string;
  city: string | null;
  address: string | null;
  industry: string;
  publicEmail: string | null;
  publicPhone: string | null;
  contactSource: string | null;
  discoverySource: 'AUTOSEO_GEO_INDEX' | 'AUTOSEO_WEB_DISCOVERY';
}

export interface DiscoverySearchInput {
  industry: string;
  country: string;
  city?: string | null;
  keywords?: string[];
  limit?: number;
}

export interface DiscoverySearchResult {
  provider: 'AUTOSEO_NATIVE_DISCOVERY';
  queriesExecuted: string[];
  businesses: DiscoveredBusiness[];
  error?: string;
}

const AGGREGATOR_DOMAINS =
  /(^|\.)(yelp|tripadvisor|facebook|instagram|linkedin|twitter|x|youtube|tiktok|wikipedia|wikidata|yellowpages|yell|trustpilot|glassdoor|indeed|foursquare|mapquest|bing|google|apple|duckduckgo|reddit|quora|pinterest|amazon|ebay|crunchbase|bbb|angi|thumbtack|nextdoor|groupon|opentable|booking|expedia|zillow|rightmove)\./i;

export function normalizeBusinessName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(ltd|llc|inc|corp|co|plc|gmbh|sarl|limited|company)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function normalizeDomain(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  try {
    const withProto = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
    const u = new URL(withProto);
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function cleanWebsiteUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  const trimmed = rawUrl.trim();
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Verifies whether a candidate website URL is live and reachable via SSRF-safe fetch.
 * Never assumes a business has no website simply because a directory omitted it.
 */
export async function verifyBusinessWebsite(
  websiteUrl: string | null
): Promise<{ status: 'VERIFIED' | 'UNVERIFIED' | 'UNREACHABLE'; finalUrl: string | null }> {
  if (!websiteUrl) {
    return { status: 'UNVERIFIED', finalUrl: null };
  }

  const headRes = await safePublicFetch(websiteUrl, { method: 'HEAD', timeoutMs: 7000 });
  if (headRes.ok || (headRes.status >= 200 && headRes.status < 400)) {
    return { status: 'VERIFIED', finalUrl: headRes.finalUrl };
  }

  // Some servers block HEAD; fall back to GET
  const getRes = await safePublicFetch(websiteUrl, { method: 'GET', timeoutMs: 8000, maxBytes: 128 * 1024 });
  if (getRes.ok || (getRes.status >= 200 && getRes.status < 400)) {
    return { status: 'VERIFIED', finalUrl: getRes.finalUrl };
  }

  return { status: 'UNREACHABLE', finalUrl: websiteUrl };
}

/**
 * Maps common industry terms to open geo-index categories for accurate worldwide queries.
 */
function resolveGeoTagFilters(industry: string): string[] {
  const lower = industry.toLowerCase();
  if (lower.includes('dent')) return ['["amenity"="dentist"]', '["healthcare"="dentist"]'];
  if (lower.includes('restaurant') || lower.includes('dining') || lower.includes('food')) {
    return ['["amenity"="restaurant"]', '["amenity"="cafe"]'];
  }
  if (lower.includes('hotel') || lower.includes('hospitality') || lower.includes('resort')) {
    return ['["tourism"="hotel"]', '["tourism"="guest_house"]'];
  }
  if (lower.includes('auto') || lower.includes('car') || lower.includes('mechanic') || lower.includes('garage')) {
    return ['["shop"="car_repair"]', '["shop"="car"]'];
  }
  if (lower.includes('law') || lower.includes('attorney') || lower.includes('legal') || lower.includes('solicitor')) {
    return ['["office"="lawyer"]'];
  }
  if (lower.includes('real estate') || lower.includes('realtor') || lower.includes('property')) {
    return ['["office"="estate_agent"]'];
  }
  if (lower.includes('clinic') || lower.includes('doctor') || lower.includes('medical') || lower.includes('health')) {
    return ['["amenity"="clinic"]', '["amenity"="doctors"]'];
  }
  if (lower.includes('salon') || lower.includes('barber') || lower.includes('beauty') || lower.includes('spa')) {
    return ['["shop"="hairdresser"]', '["shop"="beauty"]'];
  }
  if (lower.includes('gym') || lower.includes('fitness')) {
    return ['["leisure"="fitness_centre"]'];
  }
  if (lower.includes('jewel')) {
    return ['["shop"="jewelry"]'];
  }
  if (lower.includes('account') || lower.includes('tax') || lower.includes('financ')) {
    return ['["office"="accountant"]', '["office"="financial"]'];
  }
  if (lower.includes('software') || lower.includes('tech') || lower.includes('agency') || lower.includes('marketing') || lower.includes('web')) {
    return ['["office"="it"]', '["office"="advertising_agency"]', '["office"="company"]'];
  }
  if (lower.includes('plumb') || lower.includes('electric') || lower.includes('hvac') || lower.includes('roof') || lower.includes('construct')) {
    return ['["craft"="plumber"]', '["craft"="electrician"]', '["office"="construction_company"]'];
  }
  if (lower.includes('vet') || lower.includes('pet')) {
    return ['["amenity"="veterinary"]', '["shop"="pet"]'];
  }
  if (lower.includes('pharm')) {
    return ['["amenity"="pharmacy"]'];
  }
  const safeWord = lower.replace(/[^a-z0-9 ]/g, '').trim().split(/\s+/)[0] || 'company';
  return [`["name"~"${safeWord}",i]["shop"]`, `["name"~"${safeWord}",i]["office"]`, `["name"~"${safeWord}",i]["amenity"]`];
}

/**
 * In-House Tool 1: Open Worldwide Geo Business Index (Zero API keys).
 * Uses Nominatim geocoding + multi-mirror Overpass queries for real physical businesses.
 */
async function discoverViaNativeGeoIndex(input: DiscoverySearchInput): Promise<{
  businesses: DiscoveredBusiness[];
  queries: string[];
}> {
  const locationQuery = [input.city, input.country].filter(Boolean).join(', ');
  const limit = Math.min(50, Math.max(5, input.limit || 25));
  const queries = [`geo-index:${locationQuery}`];

  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'AutoSEO-NativeDiscovery/1.0 (+https://autoseo-beta.vercel.app)',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(9000),
      }
    );

    if (!geoRes.ok) return { businesses: [], queries };
    const geoData = await geoRes.json();
    if (!Array.isArray(geoData) || geoData.length === 0 || !geoData[0]?.boundingbox) {
      return { businesses: [], queries };
    }

    const [south, north, west, east] = geoData[0].boundingbox.map(Number);
    const latCenter = (south + north) / 2;
    const lonCenter = (west + east) / 2;
    const s = Math.max(south, latCenter - 0.35);
    const n = Math.min(north, latCenter + 0.35);
    const w = Math.max(west, lonCenter - 0.35);
    const e = Math.min(east, lonCenter + 0.35);
    const bbox = `${s.toFixed(5)},${w.toFixed(5)},${n.toFixed(5)},${e.toFixed(5)}`;

    const tagFilters = resolveGeoTagFilters(input.industry);
    const clauses = tagFilters.map((f) => `node${f}(${bbox});way${f}(${bbox});`).join('\n  ');
    const overpassQuery = `[out:json][timeout:16];(\n  ${clauses}\n);out center ${limit * 2};`;
    queries.push(`geo-scan:${input.industry}@${bbox}`);

    const mirrors = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ];

    let elements: any[] = [];
    for (const mirror of mirrors) {
      try {
        const res = await fetch(mirror, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'AutoSEO-NativeDiscovery/1.0 (+https://autoseo-beta.vercel.app)',
          },
          body: `data=${encodeURIComponent(overpassQuery)}`,
          signal: AbortSignal.timeout(16000),
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.elements)) {
            elements = json.elements;
            break;
          }
        }
      } catch {
        // Try next mirror
      }
    }

    const sorted = [...elements].sort((a, b) => {
      const aHasWeb = a?.tags?.website || a?.tags?.['contact:website'] ? 1 : 0;
      const bHasWeb = b?.tags?.website || b?.tags?.['contact:website'] ? 1 : 0;
      return bHasWeb - aHasWeb;
    });

    const businesses: DiscoveredBusiness[] = [];
    for (const el of sorted) {
      const tags = el?.tags || {};
      const name = tags.name?.trim();
      if (!name) continue;
      const normName = normalizeBusinessName(name);
      if (!normName) continue;

      const rawWeb = tags.website || tags['contact:website'] || tags.url || null;
      const websiteUrl = cleanWebsiteUrl(rawWeb);
      const email = tags.email || tags['contact:email'] || null;
      const phone = tags.phone || tags['contact:phone'] || null;
      const addrParts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city'], tags['addr:postcode']].filter(Boolean);

      businesses.push({
        businessName: name,
        normalizedName: normName,
        websiteUrl,
        normalizedDomain: normalizeDomain(websiteUrl),
        websiteStatus: 'UNVERIFIED',
        country: input.country,
        city: tags['addr:city'] || input.city || null,
        address: addrParts.length > 0 ? addrParts.join(' ') : null,
        industry: input.industry,
        publicEmail: email ? String(email).trim() : null,
        publicPhone: phone ? String(phone).trim() : null,
        contactSource: email || phone ? 'PUBLIC_GEO_DIRECTORY' : null,
        discoverySource: 'AUTOSEO_GEO_INDEX',
      });

      if (businesses.length >= limit) break;
    }

    return { businesses, queries };
  } catch {
    return { businesses: [], queries };
  }
}

/**
 * In-House Tool 2: Native Public Web Business Discovery (Zero API keys).
 * Discovers live business websites matching industry + location + keywords,
 * automatically filtering out social/aggregator directories.
 */
async function discoverViaNativeWebDiscovery(input: DiscoverySearchInput): Promise<{
  businesses: DiscoveredBusiness[];
  queries: string[];
}> {
  const location = [input.city, input.country].filter(Boolean).join(' ');
  const extraKw = (input.keywords || []).slice(0, 2).join(' ');
  const query = `${input.industry} ${location} ${extraKw} contact`.replace(/\s+/g, ' ').trim();
  const limit = Math.min(30, Math.max(5, input.limit || 20));
  const queries = [`web-discovery:${query}`];

  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { businesses: [], queries };
    const html = await res.text();
    const $ = cheerio.load(html);

    const businesses: DiscoveredBusiness[] = [];
    const seenDomains = new Set<string>();

    $('a.result__a').each((_, el) => {
      if (businesses.length >= limit) return;
      const rawHref = $(el).attr('href') || '';
      const rawTitle = $(el).text().trim();

      let targetUrl = rawHref;
      // Unwrap DuckDuckGo redirect uddg parameter if present
      if (rawHref.includes('uddg=')) {
        try {
          const parsed = new URL(rawHref, 'https://html.duckduckgo.com');
          const uddg = parsed.searchParams.get('uddg');
          if (uddg) targetUrl = decodeURIComponent(uddg);
        } catch {}
      }

      const cleaned = cleanWebsiteUrl(targetUrl);
      const domain = normalizeDomain(cleaned);
      if (!cleaned || !domain || seenDomains.has(domain)) return;
      if (AGGREGATOR_DOMAINS.test(domain)) return;

      seenDomains.add(domain);
      // Extract root homepage URL for clean business record
      let homepageUrl = cleaned;
      try {
        homepageUrl = new URL(cleaned).origin;
      } catch {}

      const cleanTitle = rawTitle.split(/[-|–—:]/)[0].trim();
      const businessName =
        cleanTitle.length >= 2 && cleanTitle.length <= 75
          ? cleanTitle
          : domain.split('.')[0].replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      const normName = normalizeBusinessName(businessName);
      if (!normName) return;

      businesses.push({
        businessName,
        normalizedName: normName,
        websiteUrl: homepageUrl,
        normalizedDomain: domain,
        websiteStatus: 'UNVERIFIED',
        country: input.country,
        city: input.city || null,
        address: null,
        industry: input.industry,
        publicEmail: null,
        publicPhone: null,
        contactSource: null,
        discoverySource: 'AUTOSEO_WEB_DISCOVERY',
      });
    });

    return { businesses, queries };
  } catch {
    return { businesses: [], queries };
  }
}

/**
 * Executes 100% in-house worldwide business discovery combining our Native Geo Index
 * and Native Public Web Discovery engine — zero third-party paid API keys required.
 */
export async function discoverBusinessesWorldwide(input: DiscoverySearchInput): Promise<DiscoverySearchResult> {
  const limit = Math.min(60, Math.max(5, input.limit || 25));

  const [geoRes, webRes] = await Promise.all([
    discoverViaNativeGeoIndex({ ...input, limit }),
    discoverViaNativeWebDiscovery({ ...input, limit }),
  ]);

  const merged: DiscoveredBusiness[] = [];
  const seenNames = new Set<string>();
  const seenDomains = new Set<string>();

  // Prioritize verified/website-bearing results from both native engines
  const combined = [...geoRes.businesses, ...webRes.businesses].sort((a, b) => {
    const aScore = (a.websiteUrl ? 2 : 0) + (a.publicEmail || a.publicPhone ? 1 : 0);
    const bScore = (b.websiteUrl ? 2 : 0) + (b.publicEmail || b.publicPhone ? 1 : 0);
    return bScore - aScore;
  });

  for (const biz of combined) {
    if (seenNames.has(biz.normalizedName)) continue;
    if (biz.normalizedDomain && seenDomains.has(biz.normalizedDomain)) continue;

    seenNames.add(biz.normalizedName);
    if (biz.normalizedDomain) seenDomains.add(biz.normalizedDomain);
    merged.push(biz);
    if (merged.length >= limit) break;
  }

  return {
    provider: 'AUTOSEO_NATIVE_DISCOVERY',
    queriesExecuted: [...geoRes.queries, ...webRes.queries],
    businesses: merged,
    error:
      merged.length === 0
        ? 'No businesses matched that query. Try a broader industry name or include a major city.'
        : undefined,
  };
}
