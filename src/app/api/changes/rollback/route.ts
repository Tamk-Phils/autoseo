import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { changeId } = body;

    if (!changeId) {
      return NextResponse.json({ success: false, error: 'Change ID required' }, { status: 400 });
    }

    const change = await prisma.optimizationChange.findUnique({
      where: { id: changeId },
    });

    if (!change) {
      return NextResponse.json({ success: false, error: 'Change record not found' }, { status: 404 });
    }

    // Execute rollback
    const updated = await prisma.optimizationChange.update({
      where: { id: changeId },
      data: {
        status: 'ROLLED_BACK',
        rolledBackAt: new Date(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        projectId: change.projectId,
        action: 'OPTIMIZATION_ROLLED_BACK',
        details: `Rolled back change "${change.changeType}" on ${change.affectedUrl}`,
      },
    });

    return NextResponse.json({
      success: true,
      change: updated,
      message: 'Change successfully reverted to original state.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

