import { NextResponse } from 'next/server';

/**
 * Universal Zero-Code Embed Engine
 * Customers paste: <script src="https://domain/engine.js" data-site="PROJECT_ID" async></script>
 * Dynamically injects optimized titles, meta descriptions, and schema into any website (Shopify, Webflow, WordPress, custom).
 */
export async function GET(req: Request) {
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  const jsContent = `/**
 * ApexSEO Autonomous Client Engine
 * Zero-intervention dynamic on-page optimization.
 */
(function() {
  var scriptTag = document.currentScript || document.querySelector('script[data-site]');
  if (!scriptTag) return;
  var siteId = scriptTag.getAttribute('data-site');
  if (!siteId) return;

  var currentPath = window.location.pathname || '/';

  function applyOptimizations(data) {
    if (!data || !data.overrides) return;
    var rule = data.overrides[currentPath] || data.overrides[currentPath.replace(/\\/$/, '')];
    if (!rule) return;

    // 1. Dynamic Title Tag
    if (rule.title && document.title !== rule.title) {
      document.title = rule.title;
      var ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', rule.title);
    }

    // 2. Dynamic Meta Description
    if (rule.description) {
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', rule.description);
      } else {
        var m = document.createElement('meta');
        m.name = 'description';
        m.content = rule.description;
        document.head.appendChild(m);
      }
      var ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', rule.description);
    }

    // 3. Dynamic JSON-LD Structured Data Schema
    if (rule.schemaJson) {
      try {
        var schemaEl = document.createElement('script');
        schemaEl.type = 'application/ld+json';
        schemaEl.text = typeof rule.schemaJson === 'string' ? rule.schemaJson : JSON.stringify(rule.schemaJson);
        document.head.appendChild(schemaEl);
      } catch(e) {}
    }
  }

  // Ping verification beacon
  try {
    fetch('${baseUrl}/api/tag/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: siteId, url: window.location.href }),
      keepalive: true
    }).catch(function(){});
  } catch(e) {}

  // Fetch active rules from engine
  fetch('${baseUrl}/api/tag/' + encodeURIComponent(siteId) + '?path=' + encodeURIComponent(currentPath))
    .then(function(res) { return res.json(); })
    .then(applyOptimizations)
    .catch(function(){});
})();
`;

  return new NextResponse(jsContent, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

