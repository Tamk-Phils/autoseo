import dns from 'node:dns/promises';
import net from 'node:net';

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  finalUrl: string;
  contentType: string;
  body: string;
  byteLength: number;
  ttfbMs: number;
  responseTimeMs: number;
  headers: {
    contentEncoding: string | null;
    cacheControl: string | null;
    strictTransportSecurity: string | null;
    xContentTypeOptions: string | null;
  };
  error?: string;
}

const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB cap
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Determines whether an IPv4 or IPv6 address belongs to a private, loopback,
 * link-local, cloud metadata, or otherwise non-routable internal network range.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const clean = ip.trim().toLowerCase();

  // Strip IPv4-mapped IPv6 prefix
  if (clean.startsWith('::ffff:')) {
    return isPrivateOrReservedIp(clean.slice(7));
  }

  if (net.isIPv4(clean)) {
    const parts = clean.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
    const [a, b] = parts;

    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8 (RFC1918)
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
    if (a === 127) return true; // 127.0.0.0/8 (loopback)
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local & AWS/GCP metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (RFC1918)
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 (RFC1918)
    if (a === 192 && b === 0) return true; // 192.0.0.0/24
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a >= 224) return true; // multicast & reserved
    return false;
  }

  if (net.isIPv6(clean)) {
    if (clean === '::' || clean === '::1') return true;
    if (clean.startsWith('fc') || clean.startsWith('fd')) return true; // ULA fc00::/7
    if (clean.startsWith('fe8') || clean.startsWith('fe9') || clean.startsWith('fea') || clean.startsWith('feb')) {
      return true; // Link-local fe80::/10
    }
    if (clean.startsWith('ff')) return true; // Multicast
    return false;
  }

  // Anything unparseable is treated as unsafe
  return true;
}

/**
 * Validates that a URL uses HTTP/HTTPS, is not localhost/internal metadata,
 * and resolves only to public globally routable IP addresses (DNS rebinding guard).
 */
export async function validateSafePublicUrl(rawUrl: string): Promise<{ safe: boolean; url?: URL; reason?: string }> {
  let parsed: URL;
  try {
    const normalized = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
    parsed = new URL(normalized);
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: `Blocked protocol: ${parsed.protocol}` };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal' ||
    host === 'metadata'
  ) {
    return { safe: false, reason: `Blocked internal hostname: ${host}` };
  }

  // Direct IP check
  if (net.isIP(host)) {
    if (isPrivateOrReservedIp(host)) {
      return { safe: false, reason: `Blocked private/reserved IP: ${host}` };
    }
    return { safe: true, url: parsed };
  }

  // DNS resolution check
  try {
    const records = await dns.lookup(host, { all: true });
    if (!records || records.length === 0) {
      return { safe: false, reason: `DNS resolution returned no records for ${host}` };
    }
    for (const rec of records) {
      if (isPrivateOrReservedIp(rec.address)) {
        return { safe: false, reason: `Blocked private/reserved DNS target (${rec.address}) for ${host}` };
      }
    }
    return { safe: true, url: parsed };
  } catch (err: any) {
    return { safe: false, reason: `DNS lookup failed for ${host}: ${err?.message || 'unknown error'}` };
  }
}

/**
 * Performs an SSRF-safe HTTP/HTTPS fetch with manual redirect re-validation,
 * strict timeout, and bounded response size.
 */
export async function safePublicFetch(
  rawUrl: string,
  options?: { timeoutMs?: number; maxBytes?: number; method?: 'GET' | 'HEAD' }
): Promise<SafeFetchResult> {
  const start = Date.now();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options?.maxBytes ?? MAX_BODY_BYTES;
  const method = options?.method ?? 'GET';

  let currentUrl = rawUrl;

  const emptyHeaders = {
    contentEncoding: null,
    cacheControl: null,
    strictTransportSecurity: null,
    xContentTypeOptions: null,
  };

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const validation = await validateSafePublicUrl(currentUrl);
    if (!validation.safe || !validation.url) {
      return {
        ok: false,
        status: 0,
        finalUrl: currentUrl,
        contentType: '',
        body: '',
        byteLength: 0,
        ttfbMs: Date.now() - start,
        responseTimeMs: Date.now() - start,
        headers: emptyHeaders,
        error: validation.reason || 'URL failed SSRF safety check',
      };
    }

    try {
      const res = await fetch(validation.url.toString(), {
        method,
        redirect: 'manual',
        headers: {
          'User-Agent': 'AutoSEO-IntelligenceBot/1.0 (+https://autoseo-beta.vercel.app)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      const ttfbMs = Date.now() - start;

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) {
          return {
            ok: false,
            status: res.status,
            finalUrl: validation.url.toString(),
            contentType: '',
            body: '',
            byteLength: 0,
            ttfbMs,
            responseTimeMs: Date.now() - start,
            headers: emptyHeaders,
            error: 'Redirect without Location header',
          };
        }
        currentUrl = new URL(location, validation.url).toString();
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      const responseHeaders = {
        contentEncoding: res.headers.get('content-encoding'),
        cacheControl: res.headers.get('cache-control'),
        strictTransportSecurity: res.headers.get('strict-transport-security'),
        xContentTypeOptions: res.headers.get('x-content-type-options'),
      };

      let body = '';
      let byteLength = 0;

      if (method === 'GET' && res.body) {
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            received += value.byteLength;
            if (received > maxBytes) {
              chunks.push(value.slice(0, value.byteLength - (received - maxBytes)));
              received = maxBytes;
              await reader.cancel().catch(() => {});
              break;
            }
            chunks.push(value);
          }
        }
        const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
        byteLength = buf.byteLength;
        body = buf.toString('utf8');
      }

      return {
        ok: res.ok,
        status: res.status,
        finalUrl: validation.url.toString(),
        contentType,
        body,
        byteLength,
        ttfbMs,
        responseTimeMs: Date.now() - start,
        headers: responseHeaders,
      };
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        finalUrl: validation.url.toString(),
        contentType: '',
        body: '',
        byteLength: 0,
        ttfbMs: Date.now() - start,
        responseTimeMs: Date.now() - start,
        headers: emptyHeaders,
        error: err?.message || 'Network request failed',
      };
    }
  }

  return {
    ok: false,
    status: 0,
    finalUrl: currentUrl,
    contentType: '',
    body: '',
    byteLength: 0,
    ttfbMs: Date.now() - start,
    responseTimeMs: Date.now() - start,
    headers: emptyHeaders,
    error: `Exceeded maximum redirects (${MAX_REDIRECTS})`,
  };
}
