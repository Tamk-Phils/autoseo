/**
 * Cloudflare Worker / Edge Proxy Script Generator
 * Allows dynamic on-the-fly injection of SEO fixes (titles, descriptions, JSON-LD schema)
 * across any CMS or custom site without touching source code.
 */

export function generateCloudflareWorkerScript(params: {
  siteDomain: string;
  engineApiUrl: string;
  cacheTtlSeconds?: number;
}): string {
  const ttl = params.cacheTtlSeconds || 60;

  return `/**
 * ApexSEO Edge Optimizer - Cloudflare Worker
 * Injects real-time SEO overrides (titles, meta descriptions, and structured schemas)
 * with zero-latency overhead via Cloudflare HTMLRewriter.
 */

const ENGINE_API = "${params.engineApiUrl.replace(/\/+$/, '')}/api/edge/optimize";
const TARGET_DOMAIN = "${params.siteDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}";
const CACHE_TTL = ${ttl}; // Edge cache in seconds

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Only process standard GET requests for HTML pages
    if (request.method !== "GET") {
      return fetch(request);
    }

    // Skip static assets, images, and API paths
    const pathname = url.pathname;
    if (/\\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|json|xml|txt|pdf)$/i.test(pathname)) {
      return fetch(request);
    }

    // Fetch origin response first
    const response = await fetch(request);
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return response;
    }

    // Fetch live SEO rules from ApexSEO Engine with edge caching
    let rules = null;
    try {
      const cacheUrl = new URL(ENGINE_API);
      cacheUrl.searchParams.set("domain", TARGET_DOMAIN);
      
      const rulesRes = await fetch(cacheUrl.toString(), {
        cf: { cacheTtl: CACHE_TTL, cacheEverything: true },
        headers: { "Accept": "application/json" }
      });

      if (rulesRes.ok) {
        const data = await rulesRes.json();
        rules = data.overrides || {};
      }
    } catch (e) {
      // If engine API is unreachable, fail open and return untouched origin
      return response;
    }

    const currentRule = rules ? rules[pathname] || rules[pathname.replace(/\\/$/, "")] : null;

    if (!currentRule) {
      return response;
    }

    // Rewrite HTML on the fly with Cloudflare HTMLRewriter
    let rewriter = new HTMLRewriter();

    if (currentRule.title) {
      rewriter = rewriter.on("title", {
        element(e) {
          e.setInnerContent(currentRule.title);
        }
      });
      rewriter = rewriter.on('meta[property="og:title"]', {
        element(e) {
          e.setAttribute("content", currentRule.title);
        }
      });
    }

    if (currentRule.description) {
      rewriter = rewriter.on('meta[name="description"]', {
        element(e) {
          e.setAttribute("content", currentRule.description);
        }
      });
      rewriter = rewriter.on('meta[property="og:description"]', {
        element(e) {
          e.setAttribute("content", currentRule.description);
        }
      });
    }

    if (currentRule.schemaJson) {
      rewriter = rewriter.on("head", {
        element(e) {
          e.append(\`\\n<script type="application/ld+json">\${currentRule.schemaJson}</script>\\n\`, { html: true });
        }
      });
    }

    // Stream modified response with original status & headers
    return rewriter.transform(response);
  }
};
`;
}
