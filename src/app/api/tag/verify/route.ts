import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeFetch } from '@/lib/ssrf';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== currentUser.id) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    // 1. First check if a live browser beacon was already received
    const beaconIntegration = await prisma.integration.findFirst({
      where: { projectId: project.id, type: 'EMBED_TAG', isConnected: true },
    });

    if (beaconIntegration) {
      await prisma.autopilotConfig.upsert({
        where: { projectId: project.id },
        create: { projectId: project.id, enabled: true, mode: 'AUTONOMOUS' },
        update: { enabled: true, mode: 'AUTONOMOUS' },
      });

      return NextResponse.json({
        success: true,
        installed: true,
        message: 'Tag verified! Active browser telemetry beacon received from your website.',
      });
    }

    // 2. Crawl customer's live site (test both canonical URL and www/non-www variant)
    const urlsToTest = [project.url];
    try {
      const u = new URL(project.url);
      if (u.hostname.startsWith('www.')) {
        urlsToTest.push(`${u.protocol}//${u.hostname.replace('www.', '')}${u.pathname}`);
      } else {
        urlsToTest.push(`${u.protocol}//www.${u.hostname}${u.pathname}`);
      }
    } catch {}

    let found = false;
    let checkedUrl = project.url;
    let crawlError: string | null = null;

    for (const testUrl of urlsToTest) {
      try {
        const fetchRes = await safeFetch(testUrl, {
          headers: {
            'User-Agent': 'ApexSEO-Verifier/1.0',
            Accept: 'text/html',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
          redirect: 'follow',
        });

        if (fetchRes.ok) {
          checkedUrl = testUrl;
          const html = await fetchRes.text();
          if (
            html.includes('engine.js') ||
            html.includes(`data-site="${project.id}"`) ||
            html.includes(`data-site='${project.id}'`) ||
            html.includes(project.id)
          ) {
            found = true;
            break;
          }
        }
      } catch (e: any) {
        crawlError = e.message;
      }
    }

    if (found) {
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

      await prisma.autopilotConfig.upsert({
        where: { projectId: project.id },
        create: { projectId: project.id, enabled: true, mode: 'AUTONOMOUS' },
        update: { enabled: true, mode: 'AUTONOMOUS' },
      });

      return NextResponse.json({
        success: true,
        installed: true,
        message: 'Tag successfully detected in live HTML! Autonomous Autopilot is now actively optimizing your website.',
      });
    } else {
      return NextResponse.json({
        success: true,
        installed: false,
        checkedUrl,
        error: crawlError,
        message: `Tag not yet detected in live HTML at ${checkedUrl}. If you just edited your index.html or theme, make sure the changes have been deployed/published to production.`,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
