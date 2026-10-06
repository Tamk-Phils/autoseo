import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const domainQuery = searchParams.get('domain');

    if (!domainQuery) {
      return NextResponse.json({ error: 'Domain parameter is required' }, { status: 400 });
    }

    const cleanDomain = domainQuery.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();

    // Find matching project
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { domain: { contains: cleanDomain, mode: 'insensitive' } },
          { url: { contains: cleanDomain, mode: 'insensitive' } },
        ],
      },
      include: {
        optimizationChanges: {
          where: { status: 'APPLIED' },
          orderBy: { appliedAt: 'desc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({
        domain: cleanDomain,
        overrides: {},
        message: 'No project found for domain',
      });
    }

    // Aggregate latest applied changes per path
    const overrides: Record<string, { title?: string; description?: string; schemaJson?: string; lastUpdated?: string }> = {};

    for (const change of project.optimizationChanges) {
      let path = '/';
      try {
        const u = new URL(change.affectedUrl);
        path = u.pathname;
      } catch {
        path = change.affectedUrl.startsWith('/') ? change.affectedUrl : `/${change.affectedUrl}`;
      }

      if (!overrides[path]) {
        overrides[path] = { lastUpdated: change.appliedAt.toISOString() };
      }

      const type = change.changeType.toUpperCase();
      if (type.includes('TITLE') && !overrides[path].title) {
        overrides[path].title = change.newValue;
      } else if ((type.includes('META_DESCRIPTION') || type.includes('DESCRIPTION')) && !overrides[path].description) {
        overrides[path].description = change.newValue;
      } else if (type.includes('SCHEMA') && !overrides[path].schemaJson) {
        overrides[path].schemaJson = change.newValue;
      }
    }

    return NextResponse.json(
      {
        domain: cleanDomain,
        projectId: project.id,
        overrides,
        count: Object.keys(overrides).length,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
