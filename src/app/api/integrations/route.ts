import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { testWordPressConnection } from '@/lib/integrations/wordpress';
import { testGitHubConnection } from '@/lib/integrations/github';
import { generateCloudflareWorkerScript } from '@/lib/integrations/cloudflare';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    let whereClause: any = {};
    if (projectId) {
      whereClause.projectId = projectId;
    }

    const integrations = await prisma.integration.findMany({
      where: whereClause,
      include: { project: true },
      orderBy: { createdAt: 'desc' },
    });

    // Mask sensitive credentials before returning
    const safeIntegrations = integrations.map((item) => {
      let parsedConfig: any = {};
      try {
        if (item.config) parsedConfig = JSON.parse(item.config);
      } catch {}

      if (parsedConfig.applicationPassword) {
        parsedConfig.applicationPassword = '••••••••••••••••';
      }
      if (parsedConfig.token) {
        parsedConfig.token = '••••••••••••••••' + (parsedConfig.token.slice(-4) || '');
      }

      return {
        ...item,
        config: JSON.stringify(parsedConfig),
      };
    });

    return NextResponse.json({ success: true, integrations: safeIntegrations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, type, name, config, testOnly } = body;

    if (!projectId || !type) {
      return NextResponse.json({ success: false, error: 'Project ID and integration type are required.' }, { status: 400 });
    }

    let parsedConfig = typeof config === 'string' ? JSON.parse(config) : config || {};

    // 1. Validate connection if WordPress
    if (type === 'WORDPRESS') {
      const { siteUrl, username, applicationPassword } = parsedConfig;
      if (!siteUrl || !username || !applicationPassword) {
        return NextResponse.json({
          success: false,
          error: 'WordPress requires Site URL, Admin Username, and Application Password.',
        }, { status: 400 });
      }

      const testResult = await testWordPressConnection({ siteUrl, username, applicationPassword });
      if (!testResult.success) {
        return NextResponse.json({ success: false, error: testResult.error }, { status: 400 });
      }

      if (testOnly) {
        return NextResponse.json({
          success: true,
          message: `Connection successful! Verified as WordPress user "${testResult.user?.name}".`,
        });
      }
    }

    // 2. Validate connection if GitHub
    if (type === 'GITHUB') {
      const { token, repo, defaultBranch } = parsedConfig;
      if (!token || !repo) {
        return NextResponse.json({
          success: false,
          error: 'GitHub requires a Personal Access Token and repository (owner/repo).',
        }, { status: 400 });
      }

      const testResult = await testGitHubConnection({ token, repo, defaultBranch });
      if (!testResult.success) {
        return NextResponse.json({ success: false, error: testResult.error }, { status: 400 });
      }

      if (testOnly) {
        return NextResponse.json({
          success: true,
          message: `Connection successful! Verified repository "${testResult.repoName}" on branch "${testResult.defaultBranch}".`,
        });
      }
    }

    // 3. Handle Cloudflare Edge Worker
    if (type === 'CLOUDFLARE_EDGE') {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      const host = req.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const engineUrl = `${protocol}://${host}`;

      const script = generateCloudflareWorkerScript({
        siteDomain: project?.url || 'example.com',
        engineApiUrl: engineUrl,
      });

      parsedConfig.workerScript = script;
      parsedConfig.engineApiUrl = engineUrl;

      if (testOnly) {
        return NextResponse.json({
          success: true,
          message: 'Cloudflare Worker script generated successfully.',
          script,
        });
      }
    }

    // Save or update Integration in database
    const existing = await prisma.integration.findFirst({
      where: { projectId, type },
    });

    let savedIntegration;
    if (existing) {
      savedIntegration = await prisma.integration.update({
        where: { id: existing.id },
        data: {
          name: name || existing.name,
          isConnected: true,
          config: JSON.stringify(parsedConfig),
          lastSyncedAt: new Date(),
        },
      });
    } else {
      savedIntegration = await prisma.integration.create({
        data: {
          projectId,
          type,
          name: name || `${type} Integration`,
          isConnected: true,
          config: JSON.stringify(parsedConfig),
          lastSyncedAt: new Date(),
        },
      });
    }

    // Log to AuditLog
    await prisma.auditLog.create({
      data: {
        projectId,
        action: 'INTEGRATION_CONNECTED',
        details: `Connected ${type} integration: ${name || type}`,
      },
    });

    return NextResponse.json({
      success: true,
      integration: savedIntegration,
      message: `${type} integration connected and verified successfully!`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Integration ID required' }, { status: 400 });
    }

    const item = await prisma.integration.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: `Disconnected ${item.type} integration.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
