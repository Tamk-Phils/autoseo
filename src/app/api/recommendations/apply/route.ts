import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { pushWordPressSEOChange } from '@/lib/integrations/wordpress';
import { createGitHubSEOChangePR } from '@/lib/integrations/github';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, targetIntegration } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Recommendation ID required' }, { status: 400 });
    }

    const rec = await prisma.seoRecommendation.findUnique({
      where: { id },
      include: { project: true, page: true },
    });

    if (!rec) {
      return NextResponse.json({ success: false, error: 'Recommendation not found' }, { status: 404 });
    }

    // Determine target URL and change type
    const affectedUrl = rec.page?.url || rec.project.url;
    const changeType = rec.agentType || 'ON_PAGE_OPTIMIZATION';
    const originalValue = rec.problem;
    const newValue = rec.suggestedContent || rec.recommendedAction;

    let integrationUsed = targetIntegration || 'AUTONOMOUS_ENGINE';
    let externalResultDetails: string | undefined;

    // 1. If target is WORDPRESS, push directly via WordPress REST API
    if (integrationUsed === 'WORDPRESS') {
      const wpIntegration = await prisma.integration.findFirst({
        where: { projectId: rec.projectId, type: 'WORDPRESS', isConnected: true },
      });

      if (!wpIntegration || !wpIntegration.config) {
        return NextResponse.json({
          success: false,
          error: 'WordPress integration is not configured or connected for this project.',
        }, { status: 400 });
      }

      const wpConfig = JSON.parse(wpIntegration.config);
      const pushRes = await pushWordPressSEOChange(wpConfig, {
        affectedUrl,
        changeType,
        newValue,
        reason: rec.title,
      });

      if (!pushRes.success) {
        return NextResponse.json({
          success: false,
          error: `WordPress publish failed: ${pushRes.error}`,
        }, { status: 502 });
      }

      externalResultDetails = pushRes.details;
    }

    // 2. If target is GITHUB, open an automated Pull Request with metadata changes
    if (integrationUsed === 'GITHUB') {
      const ghIntegration = await prisma.integration.findFirst({
        where: { projectId: rec.projectId, type: 'GITHUB', isConnected: true },
      });

      if (!ghIntegration || !ghIntegration.config) {
        return NextResponse.json({
          success: false,
          error: 'GitHub integration is not configured or connected for this project.',
        }, { status: 400 });
      }

      const ghConfig = JSON.parse(ghIntegration.config);
      const prRes = await createGitHubSEOChangePR(ghConfig, {
        affectedUrl,
        changeType,
        newValue,
        originalValue,
        reason: rec.title,
      });

      if (!prRes.success) {
        return NextResponse.json({
          success: false,
          error: `GitHub PR generation failed: ${prRes.error}`,
        }, { status: 502 });
      }

      externalResultDetails = `Pull Request #${prRes.prNumber} opened: ${prRes.prUrl}`;
    }

    // 3. Create persistent OptimizationChange record (Section 27 of text.txt)
    const changeRecord = await prisma.optimizationChange.create({
      data: {
        projectId: rec.projectId,
        pageId: rec.pageId,
        changeType,
        originalValue,
        newValue,
        reason: rec.title,
        affectedUrl,
        integrationUsed,
        status: 'APPLIED',
      },
    });

    // Mark recommendation as APPLIED
    await prisma.seoRecommendation.update({
      where: { id },
      data: { status: 'APPLIED' },
    });

    // Record in AuditLog
    await prisma.auditLog.create({
      data: {
        projectId: rec.projectId,
        action: 'OPTIMIZATION_APPLIED',
        details: `Applied "${rec.title}" via ${integrationUsed} to ${affectedUrl}${externalResultDetails ? ` (${externalResultDetails})` : ''}`,
      },
    });

    return NextResponse.json({
      success: true,
      change: changeRecord,
      integrationUsed,
      externalResultDetails,
      message: externalResultDetails
        ? `Optimization successfully pushed via ${integrationUsed}: ${externalResultDetails}`
        : 'Optimization successfully executed and recorded to audit history.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
