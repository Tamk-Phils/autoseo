import dns from 'node:dns/promises';
import { URL } from 'node:url';

/**
 * Validates a target URL against SSRF vulnerabilities.
 * Checks protocol, resolved IP addresses (preventing localhost, loopback, private ranges, link-local, AWS/GCP metadata IPs).
 */
export async function validateUrlForSsrf(inputUrl: string): Promise<{ valid: boolean; normalizedUrl?: string; error?: string }> {
  try {
    const parsed = new URL(inputUrl);

    // Only allow HTTP and HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only http and https protocols are permitted.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Reject direct localhost / internal aliases
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname === '0.0.0.0'
    ) {
      return { valid: false, error: 'Access to local hostnames is strictly forbidden.' };
    }

    // Resolve IP address with fallback & retries to prevent libuv threadpool EBUSY errors
    let addresses: string[] = [];
    let lastError: any = null;

    // Attempt 1: dns.lookup with retry on EBUSY / EAI_AGAIN
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const lookupResult = await dns.lookup(hostname, { all: true });
        addresses = lookupResult.map((r) => r.address);
        if (addresses.length > 0) break;
      } catch (e: any) {
        lastError = e;
        if (e.code === 'EBUSY' || e.code === 'EAI_AGAIN') {
          await new Promise((res) => setTimeout(res, 150));
          continue;
        }
        break;
      }
    }

    // Attempt 2: Fallback to c-ares dns.resolve4 and dns.resolve6 (bypasses threadpool)
    if (addresses.length === 0) {
      try {
        const ipv4s = await dns.resolve4(hostname).catch(() => []);
        const ipv6s = await dns.resolve6(hostname).catch(() => []);
        addresses = [...ipv4s, ...ipv6s];
      } catch (e: any) {
        lastError = e;
      }
    }

    if (addresses.length === 0) {
      return {
        valid: false,
        error: `Could not find website domain "${hostname}". Please double-check for spelling mistakes or typos, and verify your domain is active online.`,
      };
    }

    for (const ip of addresses) {
      if (isPrivateOrRestrictedIp(ip)) {
        return { valid: false, error: `Host resolves to prohibited private network address (${ip}).` };
      }
    }

    return { valid: true, normalizedUrl: parsed.origin };
  } catch (err: any) {
    return { valid: false, error: `Invalid URL format: ${err.message}` };
  }
}

/**
 * Checks if an IPv4 or IPv6 string is private, loopback, link-local, or metadata address.
 */
function isPrivateOrRestrictedIp(ip: string): boolean {
  // IPv4 checks
  if (ip.includes('.')) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }

    // Loopback 127.0.0.0/8
    if (parts[0] === 127) return true;

    // 0.0.0.0/8
    if (parts[0] === 0) return true;

    // Private Class A: 10.0.0.0/8
    if (parts[0] === 10) return true;

    // Private Class B: 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // Private Class C: 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;

    // Link-local / AWS / GCP Metadata: 169.254.0.0/16
    if (parts[0] === 169 && parts[1] === 254) return true;

    // Broadcast 255.255.255.255
    if (parts[0] === 255 && parts[1] === 255 && parts[2] === 255 && parts[3] === 255) return true;

    // Carrier-grade NAT: 100.64.0.0/10
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;

    return false;
  }

  // IPv6 checks
  const lower = ip.toLowerCase();
  // Loopback ::1
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
  // Link-local fe80::/10
  if (lower.startsWith('fe80:') || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
  // Unique local fc00::/7
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

  return false;
}

/**
 * Performs a fetch request only after verifying the destination against SSRF rules.
 */
export async function safeFetch(targetUrl: string, init?: RequestInit): Promise<Response> {
  const validation = await validateUrlForSsrf(targetUrl);
  if (!validation.valid) {
    throw new Error(validation.error || 'Blocked by SSRF protection');
  }
  return fetch(targetUrl, init);
}

