import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { submitToIndexNow, pingSearchEngineSitemaps } from '@/lib/indexing/indexnow';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        pages: { select: { url: true }, take: 100 },
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const urlsToSubmit = project.pages.map((p) => p.url);
    if (!urlsToSubmit.includes(project.url)) {
      urlsToSubmit.unshift(project.url);
    }

    const results = await submitToIndexNow({
      host: project.domain,
      urls: urlsToSubmit,
    });

    // Also ping sitemap if detected
    const sitemapUrl = `${project.url.replace(/\/+$/, '')}/sitemap.xml`;
    const sitemapResults = await pingSearchEngineSitemaps(sitemapUrl);

    const allResults = [...results, ...sitemapResults];

    // Log to AuditLog
    await prisma.auditLog.create({
      data: {
        projectId: project.id,
        action: 'SEARCH_ENGINES_PINGED',
        details: `Dispatched ${urlsToSubmit.length} URLs to IndexNow & Bing/Google pings.`,
      },
    });

    return NextResponse.json({
      success: true,
      urlsCount: urlsToSubmit.length,
      results: allResults,
      message: `Dispatched ${urlsToSubmit.length} URLs to IndexNow and search engines for immediate indexation.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
