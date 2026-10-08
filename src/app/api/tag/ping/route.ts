import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { siteId, url } = body;

    if (!siteId) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { OR: [{ id: siteId }, { domain: siteId }] },
    });

    if (project) {
      // Find or create integration record for EMBED_TAG
      const existing = await prisma.integration.findFirst({
        where: { projectId: project.id, type: 'EMBED_TAG' },
      });

      if (existing) {
        await prisma.integration.update({
          where: { id: existing.id },
          data: {
            isConnected: true,
            lastSyncedAt: new Date(),
            config: JSON.stringify({ lastPingFrom: url, active: true }),
          },
        });
      } else {
        await prisma.integration.create({
          data: {
            projectId: project.id,
            type: 'EMBED_TAG',
            name: '1-Line Autonomous Embed Tag',
            isConnected: true,
            lastSyncedAt: new Date(),
            config: JSON.stringify({ lastPingFrom: url, active: true }),
          },
        });
      }

      const autopilotConfig = await prisma.autopilotConfig.findUnique({ where: { projectId: project.id } });
      if (!autopilotConfig) {
        await prisma.autopilotConfig.create({ data: { projectId: project.id, enabled: true, mode: 'AUTONOMOUS' } });
      }

      const baseUrl = new URL(req.url);
      await fetch(`${baseUrl.origin}/api/crawl/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, source: 'TAG_HEARTBEAT', maxPages: project.crawlMaxPages }),
      }).catch(() => {});
    }

    return NextResponse.json(
      { success: true },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

