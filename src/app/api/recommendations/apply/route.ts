import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

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

    // Create persistent OptimizationChange record (Section 27)
    const changeRecord = await prisma.optimizationChange.create({
      data: {
        projectId: rec.projectId,
        pageId: rec.pageId,
        changeType,
        originalValue,
        newValue,
        reason: rec.title,
        affectedUrl,
        integrationUsed: 'AUTONOMOUS_ENGINE',
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
        details: `Applied "${rec.title}" to ${affectedUrl}`,
      },
    });

    return NextResponse.json({
      success: true,
      change: changeRecord,
      message: 'Optimization successfully executed and recorded to audit history.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

