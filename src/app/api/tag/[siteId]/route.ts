import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { siteId: string } }
) {
  try {
    const { siteId } = params;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    }

    // Find matching project
    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: siteId }, { domain: siteId }],
      },
      include: {
        optimizationChanges: {
          where: { status: 'APPLIED' },
          orderBy: { appliedAt: 'desc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ overrides: {}, message: 'Site not found' }, { status: 404 });
    }

    const overrides: Record<string, { title?: string; description?: string; schemaJson?: string }> = {};

    for (const change of project.optimizationChanges) {
      let path = '/';
      try {
        const u = new URL(change.affectedUrl);
        path = u.pathname;
      } catch {
        path = change.affectedUrl.startsWith('/') ? change.affectedUrl : `/${change.affectedUrl}`;
      }

      if (!overrides[path]) {
        overrides[path] = {};
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
        siteId: project.id,
        domain: project.domain,
        overrides,
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
