/**
 * Fast-Track Search Engine Indexing Protocol
 * Directly submits URLs to IndexNow (Bing, Yandex, Seznam, Naver) and Google Sitemap Pings
 * to achieve instant indexing without waiting weeks for routine bot sweeps.
 */

export interface IndexNowResult {
  engine: string;
  success: boolean;
  statusCode?: number;
  message?: string;
}

export async function submitToIndexNow(params: {
  host: string;
  urls: string[];
  key?: string;
}): Promise<IndexNowResult[]> {
  const cleanHost = params.host.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const key = params.key || 'apexseo_' + Math.random().toString(36).substring(2, 12);
  const results: IndexNowResult[] = [];

  const payload = {
    host: cleanHost,
    key: key,
    keyLocation: `https://${cleanHost}/${key}.txt`,
    urlList: params.urls.slice(0, 100),
  };

  // 1. Universal IndexNow API (Syndicates across Microsoft Bing, Yandex, Seznam)
  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'ApexSEO-Indexer/1.0',
      },
      body: JSON.stringify(payload),
    });

    results.push({
      engine: 'IndexNow (Bing / Yandex / Seznam)',
      success: res.ok || res.status === 200 || res.status === 202,
      statusCode: res.status,
      message: res.ok || res.status === 202
        ? `Successfully submitted ${params.urls.length} URLs for instant search engine indexing.`
        : `IndexNow responded with status ${res.status}`,
    });
  } catch (err: any) {
    results.push({
      engine: 'IndexNow API',
      success: false,
      message: err.message,
    });
  }

  // 2. Direct Microsoft Bing Endpoint
  try {
    const res = await fetch('https://www.bing.com/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    results.push({
      engine: 'Microsoft Bing Direct',
      success: res.ok || res.status === 200 || res.status === 202,
      statusCode: res.status,
      message: res.ok || res.status === 202
        ? 'Bing acknowledged direct URL submission.'
        : `Bing responded with status ${res.status}`,
    });
  } catch (err: any) {
    results.push({
      engine: 'Microsoft Bing',
      success: false,
      message: err.message,
    });
  }

  return results;
}

export async function pingSearchEngineSitemaps(sitemapUrl: string): Promise<IndexNowResult[]> {
  const results: IndexNowResult[] = [];

  // 1. Google sitemap ping
  try {
    const res = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, {
      method: 'GET',
      headers: { 'User-Agent': 'ApexSEO-Indexer/1.0' },
    });
    results.push({
      engine: 'Google Sitemap Ping',
      success: res.ok || res.status === 200,
      statusCode: res.status,
      message: res.ok ? 'Googlebot pinged successfully' : `Google response code: ${res.status}`,
    });
  } catch (e: any) {
    results.push({
      engine: 'Google Sitemap Ping',
      success: false,
      message: e.message,
    });
  }

  // 2. Microsoft Bing sitemap ping
  try {
    const res = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, {
      method: 'GET',
      headers: { 'User-Agent': 'ApexSEO-Indexer/1.0' },
    });
    results.push({
      engine: 'Microsoft Bing Sitemap Ping',
      success: res.ok || res.status === 200,
      statusCode: res.status,
      message: res.ok ? 'Bingbot sitemap pinged successfully' : `Bing response code: ${res.status}`,
    });
  } catch (e: any) {
    results.push({
      engine: 'Microsoft Bing Sitemap Ping',
      success: false,
      message: e.message,
    });
  }

  return results;
}

