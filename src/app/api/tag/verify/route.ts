import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeFetch } from '@/lib/ssrf';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    // Crawl customer's live homepage
    const fetchRes = await safeFetch(project.url, {
      headers: {
        'User-Agent': 'ApexSEO-Verifier/1.0',
        Accept: 'text/html',
      },
    });

    if (!fetchRes.ok) {
      return NextResponse.json({
        success: false,
        error: `Could not reach ${project.url} (HTTP ${fetchRes.status})`,
      });
    }

    const html = await fetchRes.text();
    const hasTag = html.includes('engine.js') || html.includes(`data-site="${project.id}"`) || html.includes(`data-site='${project.id}'`);

    if (hasTag) {
      // Mark EMBED_TAG integration as active
      const existing = await prisma.integration.findFirst({
        where: { projectId: project.id, type: 'EMBED_TAG' },
      });

      if (existing) {
        await prisma.integration.update({
          where: { id: existing.id },
          data: { isConnected: true, lastSyncedAt: new Date() },
        });
      } else {
        await prisma.integration.create({
          data: {
            projectId: project.id,
            type: 'EMBED_TAG',
            name: '1-Line Autonomous Embed Tag',
            isConnected: true,
            lastSyncedAt: new Date(),
            config: JSON.stringify({ verifiedAt: new Date().toISOString() }),
          },
        });
      }

      // Automatically enable Autopilot config on project
      await prisma.autopilotConfig.upsert({
        where: { projectId: project.id },
        create: {
          projectId: project.id,
          enabled: true,
          mode: 'AUTONOMOUS',
        },
        update: {
          enabled: true,
          mode: 'AUTONOMOUS',
        },
      });

      return NextResponse.json({
        success: true,
        installed: true,
        message: 'Tag successfully detected! Autonomous Autopilot is now actively optimizing your website.',
      });
    } else {
      return NextResponse.json({
        success: true,
        installed: false,
        message: 'Tag not yet detected in homepage HTML. Please verify that the <script> snippet is placed inside <head> or <body>.',
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
