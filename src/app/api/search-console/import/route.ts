import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const projectId = new URL(req.url).searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } });
    if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    const connection = await prisma.searchConsoleConnection.findUnique({ where: { projectId } });
    return NextResponse.json({ success: true, connected: Boolean(connection?.isConnected), lastSyncedAt: connection?.lastSyncedAt || null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field.trim());
    if (row.some(Boolean)) rows.push(row);
  }
  return rows;
}

function number(value: string | undefined): number {
  return Number((value || '').replace(/[^0-9.\-]/g, '')) || 0;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

    const body = await req.json();
    const { projectId, csv } = body;
    if (!projectId || typeof csv !== 'string' || !csv.trim()) {
      return NextResponse.json({ success: false, error: 'Project ID and Search Console CSV are required' }, { status: 400 });
    }

    const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } });
    if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

    const rows = parseCsv(csv);
    if (rows.length < 2) return NextResponse.json({ success: false, error: 'The CSV contains no query rows' }, { status: 400 });

    const headers = rows[0].map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const find = (...names: string[]) => headers.findIndex((header) => names.includes(header));
    const queryIndex = find('query', 'topqueries');
    const pageIndex = find('page', 'toppages');
    const clicksIndex = find('clicks');
    const impressionsIndex = find('impressions');
    const ctrIndex = find('ctr');
    const positionIndex = find('position', 'averageposition');
    if (queryIndex < 0 || clicksIndex < 0 || impressionsIndex < 0 || ctrIndex < 0 || positionIndex < 0) {
      return NextResponse.json({ success: false, error: 'CSV must include Query, Clicks, Impressions, CTR, and Position columns' }, { status: 400 });
    }

    const importedAt = new Date();
    const imported = rows.slice(1).map((row) => ({
      query: row[queryIndex],
      page: pageIndex >= 0 ? row[pageIndex] || project.url : project.url,
      clicks: Math.round(number(row[clicksIndex])),
      impressions: Math.round(number(row[impressionsIndex])),
      ctr: number(row[ctrIndex].replace('%', '')) / (row[ctrIndex].includes('%') ? 1 : 0.01),
      position: number(row[positionIndex]),
    })).filter((item) => item.query);

    if (!imported.length) return NextResponse.json({ success: false, error: 'No valid query rows found in CSV' }, { status: 400 });

    const previous = await prisma.searchConsoleData.findMany({ where: { projectId }, orderBy: { date: 'desc' }, take: imported.length * 2 });
    const previousByQuery = new Map<string, number>();
    for (const item of previous) if (!previousByQuery.has(item.query)) previousByQuery.set(item.query, item.position);

    await prisma.searchConsoleData.createMany({ data: imported.map((item) => ({ projectId, ...item, date: importedAt })) });

    for (const item of imported) {
      const previousPosition = previousByQuery.get(item.query);
      const trend = previousPosition == null ? 'STABLE' : item.position < previousPosition ? 'UP' : item.position > previousPosition ? 'DOWN' : 'STABLE';
      const isOpportunity = item.position >= 4 && item.position <= 20;
      await prisma.keyword.upsert({
        where: { id: `${project.id}-${item.query}` },
        create: {
          id: `${project.id}-${item.query}`,
          projectId,
          term: item.query,
          source: 'SEARCH_CONSOLE',
          searchIntent: 'Search Console query',
          currentPosition: item.position,
          previousPosition,
          bestPosition: item.position,
          searchVolume: null,
          difficulty: null,
          ctr: item.ctr,
          clicks: item.clicks,
          impressions: item.impressions,
          rankingUrl: item.page,
          trend,
          isOpportunity,
          opportunityNote: isOpportunity ? 'Verified Search Console query currently ranking between positions 4 and 20.' : 'Verified Search Console data. Search volume and keyword difficulty require an SEO data provider.',
        },
        update: {
          source: 'SEARCH_CONSOLE', currentPosition: item.position, previousPosition, bestPosition: item.position,
          ctr: item.ctr, clicks: item.clicks, impressions: item.impressions, rankingUrl: item.page, trend, isOpportunity,
          opportunityNote: isOpportunity ? 'Verified Search Console query currently ranking between positions 4 and 20.' : 'Verified Search Console data. Search volume and keyword difficulty require an SEO data provider.',
        },
      });
    }

    await prisma.searchConsoleConnection.upsert({
      where: { projectId },
      create: { projectId, siteUrl: project.url, isConnected: true, lastSyncedAt: importedAt },
      update: { isConnected: true, lastSyncedAt: importedAt },
    });

    return NextResponse.json({ success: true, imported: imported.length, syncedAt: importedAt });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}