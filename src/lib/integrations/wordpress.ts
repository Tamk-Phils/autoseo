/**
 * WordPress REST API Integration Client
 * Supports updating Post/Page titles, meta descriptions, Yoast SEO, and RankMath SEO fields.
 */

export interface WordPressConfig {
  siteUrl: string;
  username: string;
  applicationPassword: string; // WP Application Password (e.g. "xxxx xxxx xxxx xxxx")
}

export async function testWordPressConnection(config: WordPressConfig): Promise<{
  success: boolean;
  user?: { name: string; slug: string; id: number };
  error?: string;
}> {
  try {
    const cleanUrl = config.siteUrl.replace(/\/+$/, '');
    const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.applicationPassword.replace(/\s+/g, '')}`).toString('base64');

    const res = await fetch(`${cleanUrl}/wp-json/wp/v2/users/me?context=edit`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorText = await res.text();
      return {
        success: false,
        error: `WordPress authentication failed (HTTP ${res.status}): ${errorText.slice(0, 150)}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      user: {
        id: data.id,
        name: data.name,
        slug: data.slug,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network error connecting to WordPress: ${err.message}`,
    };
  }
}

export async function pushWordPressSEOChange(
  config: WordPressConfig,
  params: {
    affectedUrl: string;
    changeType: string;
    newValue: string;
    reason: string;
  }
): Promise<{
  success: boolean;
  postId?: number;
  postType?: string;
  details?: string;
  error?: string;
}> {
  try {
    const cleanUrl = config.siteUrl.replace(/\/+$/, '');
    const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.applicationPassword.replace(/\s+/g, '')}`).toString('base64');

    // Extract slug from affectedUrl
    let urlPath = '';
    try {
      const parsed = new URL(params.affectedUrl);
      urlPath = parsed.pathname.replace(/^\/|\/$/g, '');
    } catch {
      urlPath = params.affectedUrl.replace(/^\/|\/$/g, '');
    }

    const slug = urlPath.split('/').pop() || '';

    // Search for matching post or page
    let targetPost: any = null;
    let postType = 'posts';

    if (slug) {
      // 1. Try posts
      const postSearch = await fetch(`${cleanUrl}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}`, {
        headers: { Authorization: authHeader, Accept: 'application/json' },
      });
      if (postSearch.ok) {
        const posts = await postSearch.json();
        if (Array.isArray(posts) && posts.length > 0) {
          targetPost = posts[0];
          postType = 'posts';
        }
      }

      // 2. Try pages if not found in posts
      if (!targetPost) {
        const pageSearch = await fetch(`${cleanUrl}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}`, {
          headers: { Authorization: authHeader, Accept: 'application/json' },
        });
        if (pageSearch.ok) {
          const pages = await pageSearch.json();
          if (Array.isArray(pages) && pages.length > 0) {
            targetPost = pages[0];
            postType = 'pages';
          }
        }
      }
    }

    // If still not found and root page, find the front page
    if (!targetPost && (!slug || slug === '')) {
      const pageSearch = await fetch(`${cleanUrl}/wp-json/wp/v2/pages?per_page=1`, {
        headers: { Authorization: authHeader, Accept: 'application/json' },
      });
      if (pageSearch.ok) {
        const pages = await pageSearch.json();
        if (Array.isArray(pages) && pages.length > 0) {
          targetPost = pages[0];
          postType = 'pages';
        }
      }
    }

    if (!targetPost) {
      return {
        success: false,
        error: `Could not locate a matching WordPress post or page for slug "${slug || '/'}"`,
      };
    }

    // Build update payload based on changeType
    const payload: Record<string, any> = {};
    const metaPayload: Record<string, any> = {};

    if (params.changeType.toUpperCase().includes('TITLE')) {
      payload.title = params.newValue;
      // Yoast & RankMath meta support
      metaPayload._yoast_wpseo_title = params.newValue;
      metaPayload.rank_math_title = params.newValue;
    } else if (params.changeType.toUpperCase().includes('META_DESCRIPTION') || params.changeType.toUpperCase().includes('DESCRIPTION')) {
      payload.excerpt = params.newValue;
      // Yoast & RankMath meta support
      metaPayload._yoast_wpseo_metadesc = params.newValue;
      metaPayload.rank_math_description = params.newValue;
    }

    if (Object.keys(metaPayload).length > 0) {
      payload.meta = metaPayload;
    }

    const updateRes = await fetch(`${cleanUrl}/wp-json/wp/v2/${postType}/${targetPost.id}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return {
        success: false,
        error: `WordPress update failed (HTTP ${updateRes.status}): ${errText.slice(0, 150)}`,
      };
    }

    const updated = await updateRes.json();
    return {
      success: true,
      postId: updated.id,
      postType,
      details: `Successfully published updated ${params.changeType} to WordPress ${postType} #${updated.id} (${updated.link || slug})`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Error pushing to WordPress: ${err.message}`,
    };
  }
}

