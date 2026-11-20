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
  discoverySource: 'GOOGLE_PLACES' | 'BING_SEARCH' | 'OPENSTREETMAP';
}

export interface DiscoverySearchInput {
  industry: string;
  country: string;
  city?: string | null;
  keywords?: string[];
  limit?: number;
}

export interface DiscoverySearchResult {
  provider: 'GOOGLE_PLACES' | 'BING_SEARCH' | 'OPENSTREETMAP';
  queriesExecuted: string[];
  businesses: DiscoveredBusiness[];
  error?: string;
}

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
 * Never assumes a business has no website simply because a provider omitted it.
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
 * Maps common industry terms to OpenStreetMap tags for accurate worldwide queries.
 */
function resolveOsmTagFilters(industry: string): string[] {
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
  // General fallback: commercial shops & offices matching name/category
  const safeWord = lower.replace(/[^a-z0-9 ]/g, '').trim().split(/\s+/)[0] || 'company';
  return [`["name"~"${safeWord}",i]["shop"]`, `["name"~"${safeWord}",i]["office"]`, `["name"~"${safeWord}",i]["amenity"]`];
}

/**
 * Provider 1: Google Places Text Search API (when GOOGLE_PLACES_API_KEY is configured).
 */
async function discoverViaGooglePlaces(input: DiscoverySearchInput): Promise<DiscoverySearchResult | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) return null;

  const location = [input.city, input.country].filter(Boolean).join(', ');
  const query = `${input.industry} in ${location}`;
  const limit = Math.min(20, Math.max(5, input.limit || 20));

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.websiteUri,places.internationalPhoneNumber',
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: limit,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return {
        provider: 'GOOGLE_PLACES',
        queriesExecuted: [query],
        businesses: [],
        error: `Google Places HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const places = Array.isArray(data?.places) ? data.places : [];
    const businesses: DiscoveredBusiness[] = [];

    for (const place of places) {
      const name = place?.displayName?.text?.trim();
      if (!name) continue;
      const websiteUrl = cleanWebsiteUrl(place?.websiteUri);
      businesses.push({
        businessName: name,
        normalizedName: normalizeBusinessName(name),
        websiteUrl,
        normalizedDomain: normalizeDomain(websiteUrl),
        websiteStatus: websiteUrl ? 'UNVERIFIED' : 'UNVERIFIED',
        country: input.country,
        city: input.city || null,
        address: place?.formattedAddress || null,
        industry: input.industry,
        publicEmail: null,
        publicPhone: place?.internationalPhoneNumber || null,
        contactSource: place?.internationalPhoneNumber ? 'GOOGLE_PLACES' : null,
        discoverySource: 'GOOGLE_PLACES',
      });
    }

    return {
      provider: 'GOOGLE_PLACES',
      queriesExecuted: [query],
      businesses,
    };
  } catch (err: any) {
    return {
      provider: 'GOOGLE_PLACES',
      queriesExecuted: [query],
      businesses: [],
      error: err?.message || 'Google Places request failed',
    };
  }
}

/**
 * Provider 2: Bing Web Search API (when BING_SEARCH_API_KEY is configured).
 */
async function discoverViaBingSearch(input: DiscoverySearchInput): Promise<DiscoverySearchResult | null> {
  const apiKey = process.env.BING_SEARCH_API_KEY?.trim();
  if (!apiKey) return null;

  const location = [input.city, input.country].filter(Boolean).join(' ');
  const query = `${input.industry} ${location} official website`;
  const limit = Math.min(25, Math.max(5, input.limit || 20));

  try {
    const res = await fetch(
      `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${limit}`,
      {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey },
        signal: AbortSignal.timeout(12000),
      }
    );

    if (!res.ok) {
      return {
        provider: 'BING_SEARCH',
        queriesExecuted: [query],
        businesses: [],
        error: `Bing Search HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const pages = Array.isArray(data?.webPages?.value) ? data.webPages.value : [];
    const businesses: DiscoveredBusiness[] = [];

    for (const item of pages) {
      const websiteUrl = cleanWebsiteUrl(item?.url);
      const domain = normalizeDomain(websiteUrl);
      if (!domain) continue;
      // Skip major aggregator directories so we focus on real businesses
      if (/yelp\.|tripadvisor\.|facebook\.|linkedin\.|yellowpages\.|wikipedia\.|instagram\./i.test(domain)) {
        continue;
      }
      const rawTitle = (item?.name || domain).split(/[-|–—:]/)[0].trim();
      const businessName = rawTitle.length >= 2 ? rawTitle : domain;
      businesses.push({
        businessName,
        normalizedName: normalizeBusinessName(businessName),
        websiteUrl,
        normalizedDomain: domain,
        websiteStatus: 'UNVERIFIED',
        country: input.country,
        city: input.city || null,
        address: null,
        industry: input.industry,
        publicEmail: null,
        publicPhone: null,
        contactSource: null,
        discoverySource: 'BING_SEARCH',
      });
    }

    return {
      provider: 'BING_SEARCH',
      queriesExecuted: [query],
      businesses,
    };
  } catch (err: any) {
    return {
      provider: 'BING_SEARCH',
      queriesExecuted: [query],
      businesses: [],
      error: err?.message || 'Bing Search request failed',
    };
  }
}

/**
 * Provider 3: OpenStreetMap Nominatim + Overpass Open Data API (free, global, authorized).
 */
async function discoverViaOpenStreetMap(input: DiscoverySearchInput): Promise<DiscoverySearchResult> {
  const locationQuery = [input.city, input.country].filter(Boolean).join(', ');
  const limit = Math.min(50, Math.max(5, input.limit || 25));
  const queriesExecuted = [`nominatim:${locationQuery}`];

  try {
    // 1. Geocode target city/country bounding box via Nominatim
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'AutoSEO-AcquisitionEngine/1.0 (+https://autoseo-beta.vercel.app)',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!geoRes.ok) {
      return {
        provider: 'OPENSTREETMAP',
        queriesExecuted,
        businesses: [],
        error: `Nominatim geocoding failed with HTTP ${geoRes.status}`,
      };
    }

    const geoData = await geoRes.json();
    if (!Array.isArray(geoData) || geoData.length === 0 || !geoData[0]?.boundingbox) {
      return {
        provider: 'OPENSTREETMAP',
        queriesExecuted,
        businesses: [],
        error: `Could not geocode location "${locationQuery}"`,
      };
    }

    const [south, north, west, east] = geoData[0].boundingbox.map(Number);
    // Clamp bounding box to ~0.35 deg radius around center for country-wide searches so Overpass stays fast
    const latCenter = (south + north) / 2;
    const lonCenter = (west + east) / 2;
    const s = Math.max(south, latCenter - 0.35);
    const n = Math.min(north, latCenter + 0.35);
    const w = Math.max(west, lonCenter - 0.35);
    const e = Math.min(east, lonCenter + 0.35);
    const bbox = `${s.toFixed(5)},${w.toFixed(5)},${n.toFixed(5)},${e.toFixed(5)}`;

    const tagFilters = resolveOsmTagFilters(input.industry);
    const clauses = tagFilters
      .map((f) => `node${f}(${bbox});way${f}(${bbox});`)
      .join('\n  ');

    const overpassQuery = `[out:json][timeout:18];(\n  ${clauses}\n);out center ${limit * 2};`;
    queriesExecuted.push(`overpass:${input.industry}@${bbox}`);

    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'AutoSEO-AcquisitionEngine/1.0 (+https://autoseo-beta.vercel.app)',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: AbortSignal.timeout(20000),
    });

    if (!overpassRes.ok) {
      return {
        provider: 'OPENSTREETMAP',
        queriesExecuted,
        businesses: [],
        error: `Overpass API HTTP ${overpassRes.status}`,
      };
    }

    const overpassJson = await overpassRes.json();
    const elements = Array.isArray(overpassJson?.elements) ? overpassJson.elements : [];

    const seen = new Set<string>();
    const businesses: DiscoveredBusiness[] = [];

    // Prioritize records that include a website first, then fill with remaining businesses
    const sorted = [...elements].sort((a, b) => {
      const aHasWeb = a?.tags?.website || a?.tags?.['contact:website'] ? 1 : 0;
      const bHasWeb = b?.tags?.website || b?.tags?.['contact:website'] ? 1 : 0;
      return bHasWeb - aHasWeb;
    });

    for (const el of sorted) {
      const tags = el?.tags || {};
      const name = tags.name?.trim();
      if (!name) continue;

      const normName = normalizeBusinessName(name);
      if (!normName || seen.has(normName)) continue;
      seen.add(normName);

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
        contactSource: email || phone ? 'OPENSTREETMAP_PUBLIC_DIRECTORY' : null,
        discoverySource: 'OPENSTREETMAP',
      });

      if (businesses.length >= limit) break;
    }

    return {
      provider: 'OPENSTREETMAP',
      queriesExecuted,
      businesses,
    };
  } catch (err: any) {
    return {
      provider: 'OPENSTREETMAP',
      queriesExecuted,
      businesses: [],
      error: err?.message || 'OpenStreetMap discovery failed',
    };
  }
}

/**
 * Executes worldwide business discovery using the best available authorized provider:
 * Google Places API -> Bing Web Search API -> OpenStreetMap Open Data API.
 */
export async function discoverBusinessesWorldwide(input: DiscoverySearchInput): Promise<DiscoverySearchResult> {
  // 1. Try Google Places if API key is configured
  const googleResult = await discoverViaGooglePlaces(input);
  if (googleResult && googleResult.businesses.length > 0) {
    return googleResult;
  }

  // 2. Try Bing Web Search if API key is configured
  const bingResult = await discoverViaBingSearch(input);
  if (bingResult && bingResult.businesses.length > 0) {
    return bingResult;
  }

  // 3. Default to authorized global OpenStreetMap Overpass + Nominatim
  return discoverViaOpenStreetMap(input);
}
