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
  discoverySource: 'AUTOSEO_GEO_INDEX' | 'AUTOSEO_PHOTON_INDEX';
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

/**
 * Major commercial metro hubs per country so country-wide searches scan real cities
 * instead of empty geographic midpoints (oceans/deserts).
 */
const COUNTRY_MAJOR_CITIES: Record<string, string[]> = {
  'united states': ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Houston'],
  'united states of america': ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Houston'],
  'usa': ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Houston'],
  'us': ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Houston'],
  'united kingdom': ['London', 'Manchester', 'Birmingham', 'Leeds'],
  'uk': ['London', 'Manchester', 'Birmingham', 'Leeds'],
  'canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
  'australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
  'nigeria': ['Lagos', 'Abuja', 'Port Harcourt'],
  'south africa': ['Johannesburg', 'Cape Town', 'Durban'],
  'kenya': ['Nairobi', 'Mombasa'],
  'ghana': ['Accra', 'Kumasi'],
  'germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt'],
  'france': ['Paris', 'Lyon', 'Marseille'],
  'spain': ['Madrid', 'Barcelona', 'Valencia'],
  'italy': ['Milan', 'Rome', 'Naples'],
  'netherlands': ['Amsterdam', 'Rotterdam', 'Utrecht'],
  'india': ['Mumbai', 'Delhi', 'Bengaluru'],
  'united arab emirates': ['Dubai', 'Abu Dhabi'],
  'uae': ['Dubai', 'Abu Dhabi'],
  'singapore': ['Singapore'],
  'brazil': ['Sao Paulo', 'Rio de Janeiro'],
  'mexico': ['Mexico City', 'Monterrey', 'Guadalajara'],
  'ireland': ['Dublin', 'Cork'],
};

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
 */
export async function verifyBusinessWebsite(
  websiteUrl: string | null
): Promise<{ status: 'VERIFIED' | 'UNVERIFIED' | 'UNREACHABLE'; finalUrl: string | null }> {
  if (!websiteUrl) {
    return { status: 'UNVERIFIED', finalUrl: null };
  }

  const headRes = await safePublicFetch(websiteUrl, { method: 'HEAD', timeoutMs: 6000 });
  if (headRes.ok || (headRes.status >= 200 && headRes.status < 400)) {
    return { status: 'VERIFIED', finalUrl: headRes.finalUrl };
  }

  const getRes = await safePublicFetch(websiteUrl, { method: 'GET', timeoutMs: 7000, maxBytes: 128 * 1024 });
  if (getRes.ok || (getRes.status >= 200 && getRes.status < 400)) {
    return { status: 'VERIFIED', finalUrl: getRes.finalUrl };
  }

  return { status: 'UNREACHABLE', finalUrl: websiteUrl };
}

/**
 * Normalizes broad industry labels into clean, high-yield POI search terms.
 */
function buildIndustrySearchTerms(industry: string): string[] {
  const lower = industry.toLowerCase().trim();
  if (lower.includes('jewel')) return ['jewelry', 'jeweler'];
  if (lower.includes('car') || lower.includes('auto') || lower.includes('vehicle')) {
    return ['car dealer', 'auto repair'];
  }
  if (lower.includes('pet') || lower.includes('dog') || lower.includes('cat')) {
    return ['pet shop', 'veterinary'];
  }
  if (lower.includes('dent')) return ['dentist', 'dental clinic'];
  if (lower.includes('restaurant') || lower.includes('food') || lower.includes('dining')) {
    return ['restaurant', 'cafe'];
  }
  if (lower.includes('ship') || lower.includes('logistics') || lower.includes('freight') || lower.includes('courier')) {
    return ['logistics', 'shipping'];
  }
  if (lower.includes('real estate') || lower.includes('property')) return ['real estate'];
  if (lower.includes('law') || lower.includes('attorney') || lower.includes('legal')) return ['lawyer'];
  if (lower.includes('salon') || lower.includes('beauty') || lower.includes('barber')) return ['beauty salon'];
  if (lower.includes('hotel')) return ['hotel'];
  if (lower.includes('clinic') || lower.includes('medical') || lower.includes('doctor')) return ['medical clinic'];
  if (lower.includes('gym') || lower.includes('fitness')) return ['fitness'];
  if (lower.includes('plumb') || lower.includes('electric') || lower.includes('hvac')) return [lower.split(/\s+/)[0]];

  // Strip noise words like "&" or "store" for cleaner POI matching
  const cleaned = lower.replace(/&/g, ' ').replace(/\b(store|shop|services|solutions|company)\b/g, '').replace(/\s+/g, ' ').trim();
  return [cleaned || lower];
}

/**
 * Resolves target cities to scan. If user specified a city, scans that city.
 * If user only specified a country, fans out across that country's top 3 major metro cities.
 */
function resolveTargetCities(country: string, city?: string | null): string[] {
  if (city && city.trim().length >= 2) {
    return [city.trim()];
  }
  const key = country.trim().toLowerCase();
  const mapped = COUNTRY_MAJOR_CITIES[key];
  if (mapped && mapped.length > 0) {
    return mapped.slice(0, 3);
  }
  return [country.trim()];
}

/**
 * In-House Tool 1: Fast Nominatim Global POI Index (Zero API keys, ~1.5s per city).
 * Returns up to 40 real businesses per city with extratags (website, phone, email, address).
 */
async function discoverViaNominatimPoi(
  term: string,
  cityOrLocation: string,
  country: string,
  industryLabel: string
): Promise<{ businesses: DiscoveredBusiness[]; query: string }> {
  const q = `${term} ${cityOrLocation}`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    q
  )}&format=jsonv2&extratags=1&addressdetails=1&limit=40`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AutoSEO-NativeDiscovery/1.0 (+https://autoseo-beta.vercel.app)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return { businesses: [], query: `nominatim-poi:${q}` };
    const items = await res.json();
    if (!Array.isArray(items)) return { businesses: [], query: `nominatim-poi:${q}` };

    const businesses: DiscoveredBusiness[] = [];
    for (const item of items) {
      const name = (item?.name || '').trim();
      if (!name || name.length < 2) continue;
      // Skip administrative boundaries / roads / cities that aren't businesses
      if (['boundary', 'highway', 'place', 'waterway', 'natural'].includes(item?.category)) continue;

      const normName = normalizeBusinessName(name);
      if (!normName) continue;

      const extra = item?.extratags || {};
      const addr = item?.address || {};
      const rawWeb = extra.website || extra['contact:website'] || extra.url || null;
      const websiteUrl = cleanWebsiteUrl(rawWeb);
      const email = extra.email || extra['contact:email'] || null;
      const phone = extra.phone || extra['contact:phone'] || null;

      const resolvedCity =
        addr.city || addr.town || addr.village || addr.municipality || addr.suburb || cityOrLocation;
      const resolvedCountry = addr.country || country;
      const addrStr = [addr.house_number, addr.road, resolvedCity, addr.postcode].filter(Boolean).join(' ') || null;

      businesses.push({
        businessName: name,
        normalizedName: normName,
        websiteUrl,
        normalizedDomain: normalizeDomain(websiteUrl),
        websiteStatus: 'UNVERIFIED',
        country: resolvedCountry,
        city: resolvedCity,
        address: addrStr,
        industry: industryLabel,
        publicEmail: email ? String(email).trim() : null,
        publicPhone: phone ? String(phone).trim() : null,
        contactSource: email || phone ? 'PUBLIC_GEO_DIRECTORY' : null,
        discoverySource: 'AUTOSEO_GEO_INDEX',
      });
    }

    return { businesses, query: `nominatim-poi:${q}` };
  } catch {
    return { businesses: [], query: `nominatim-poi:${q}` };
  }
}

/**
 * In-House Tool 2: Fast Photon Komoot Global Business Index (Zero API keys, ~1s).
 */
async function discoverViaPhotonPoi(
  term: string,
  cityOrLocation: string,
  country: string,
  industryLabel: string
): Promise<{ businesses: DiscoveredBusiness[]; query: string }> {
  const q = `${term} ${cityOrLocation}`;
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=30`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AutoSEO-NativeDiscovery/1.0 (+https://autoseo-beta.vercel.app)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) return { businesses: [], query: `photon-poi:${q}` };
    const data = await res.json();
    const features = Array.isArray(data?.features) ? data.features : [];

    const businesses: DiscoveredBusiness[] = [];
    for (const f of features) {
      const p = f?.properties || {};
      const name = (p.name || '').trim();
      if (!name || name.length < 2) continue;
      if (['boundary', 'highway', 'place', 'waterway'].includes(p.osm_key)) continue;

      const normName = normalizeBusinessName(name);
      if (!normName) continue;

      const addrStr = [p.housenumber, p.street, p.city, p.postcode].filter(Boolean).join(' ') || null;
      businesses.push({
        businessName: name,
        normalizedName: normName,
        websiteUrl: null,
        normalizedDomain: null,
        websiteStatus: 'UNVERIFIED',
        country: p.country || country,
        city: p.city || cityOrLocation,
        address: addrStr,
        industry: industryLabel,
        publicEmail: null,
        publicPhone: null,
        contactSource: null,
        discoverySource: 'AUTOSEO_PHOTON_INDEX',
      });
    }

    return { businesses, query: `photon-poi:${q}` };
  } catch {
    return { businesses: [], query: `photon-poi:${q}` };
  }
}

/**
 * Executes high-yield, 100% in-house worldwide business discovery across real metropolitan hubs
 * using Nominatim Global POI Index + Photon Open Business Index (zero third-party API keys).
 */
export async function discoverBusinessesWorldwide(input: DiscoverySearchInput): Promise<DiscoverySearchResult> {
  const limit = Math.min(80, Math.max(10, input.limit || 40));
  const cities = resolveTargetCities(input.country, input.city);
  const terms = buildIndustrySearchTerms(input.industry);
  const primaryTerm = terms[0];

  const tasks: Array<Promise<{ businesses: DiscoveredBusiness[]; query: string }>> = [];

  // Fan out across top cities in parallel using Nominatim POI + Photon POI
  for (const city of cities) {
    tasks.push(discoverViaNominatimPoi(primaryTerm, city, input.country, input.industry));
    if (terms[1] && cities.length === 1) {
      tasks.push(discoverViaNominatimPoi(terms[1], city, input.country, input.industry));
    }
  }
  tasks.push(discoverViaPhotonPoi(primaryTerm, cities[0], input.country, input.industry));

  const results = await Promise.all(tasks);
  const queriesExecuted = results.map((r) => r.query);
  const allFound = results.flatMap((r) => r.businesses);

  // Prioritize records that already include websites and phone/email contacts
  allFound.sort((a, b) => {
    const aScore = (a.websiteUrl ? 4 : 0) + (a.publicEmail ? 2 : 0) + (a.publicPhone ? 1 : 0);
    const bScore = (b.websiteUrl ? 4 : 0) + (b.publicEmail ? 2 : 0) + (b.publicPhone ? 1 : 0);
    return bScore - aScore;
  });

  const merged: DiscoveredBusiness[] = [];
  const seenNames = new Set<string>();
  const seenDomains = new Set<string>();

  for (const biz of allFound) {
    if (seenNames.has(biz.normalizedName)) continue;
    if (biz.normalizedDomain && seenDomains.has(biz.normalizedDomain)) continue;

    seenNames.add(biz.normalizedName);
    if (biz.normalizedDomain) seenDomains.add(biz.normalizedDomain);
    merged.push(biz);
    if (merged.length >= limit) break;
  }

  return {
    provider: 'AUTOSEO_NATIVE_DISCOVERY',
    queriesExecuted,
    businesses: merged,
    error:
      merged.length === 0
        ? 'No businesses matched that query. Try a broader industry name or major city.'
        : undefined,
  };
}
