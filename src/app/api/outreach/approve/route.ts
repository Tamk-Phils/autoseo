import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveTenantContext } from '@/lib/acquisition/tenant';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { messageId, action, subject, messageBody } = body;

    if (!messageId || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'messageId and action (APPROVE | REJECT) are required' }, { status: 400 });
    }

    const msg = await prisma.outreachMessage.findFirst({
      where: { id: messageId, organizationId: tenant.organization.id },
      include: { lead: true },
    });

    if (!msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (action === 'APPROVE' && (msg.lead.isOptedOut || msg.lead.status === 'UNSUBSCRIBED')) {
      return NextResponse.json(
        { error: 'Cannot approve outreach for an opted-out / unsubscribed lead.' },
        { status: 400 }
      );
    }

    const updated = await prisma.outreachMessage.update({
      where: { id: msg.id },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        subject: typeof subject === 'string' && subject.trim() ? subject.trim() : msg.subject,
        body: typeof messageBody === 'string' && messageBody.trim() ? messageBody.trim() : msg.body,
        approvedById: action === 'APPROVE' ? tenant.user.id : null,
        approvedAt: action === 'APPROVE' ? new Date() : null,
      },
    });

    if (action === 'APPROVE' && ['DISCOVERED', 'ANALYSED', 'QUALIFIED'].includes(msg.lead.status)) {
      await prisma.lead.update({
        where: { id: msg.lead.id },
        data: { status: 'CONTACT_APPROVED' },
      });
    }

    return NextResponse.json({ success: true, message: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Approval update failed' }, { status: 500 });
  }
}
