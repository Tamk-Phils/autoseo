import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveTenantContext } from '@/lib/acquisition/tenant';
import { classifyProspectReply } from '@/lib/acquisition/salesAgent';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const msg = await prisma.outreachMessage.findFirst({
      where: { id: params.id, organizationId: tenant.organization.id },
      include: { lead: true },
    });

    if (!msg) {
      return NextResponse.json({ error: 'Outreach message not found' }, { status: 404 });
    }

    const body = await req.json();
    const replyText = String(body.replyText || '').trim();
    if (!replyText) {
      return NextResponse.json({ error: 'replyText is required' }, { status: 400 });
    }

    const result = await classifyProspectReply(replyText);

    // Record inbound reply
    const inbound = await prisma.outreachMessage.create({
      data: {
        organizationId: tenant.organization.id,
        leadId: msg.leadId,
        channel: msg.channel,
        direction: 'INBOUND',
        subject: `Re: ${msg.subject || 'SEO Assessment'}`,
        body: replyText,
        status: 'REPLIED',
        replyClassification: result.classification,
      },
    });

    // Update original outbound message classification
    await prisma.outreachMessage.update({
      where: { id: msg.id },
      data: {
        status: 'REPLIED',
        replyClassification: result.classification,
      },
    });

    // Update lead status & enforce immediate suppression on UNSUBSCRIBE
    await prisma.lead.update({
      where: { id: msg.leadId },
      data: {
        status: result.suggestedNextStatus,
        isOptedOut: result.shouldSuppress ? true : msg.lead.isOptedOut,
        lastInteractionAt: new Date(),
      },
    });

    if (result.shouldSuppress) {
      const idToSuppress = msg.lead.publicEmail?.toLowerCase() || msg.lead.normalizedDomain;
      if (idToSuppress) {
        await prisma.suppressionEntry.upsert({
          where: {
            organizationId_identifier: {
              organizationId: tenant.organization.id,
              identifier: idToSuppress,
            },
          },
          update: { reason: 'UNSUBSCRIBE' },
          create: {
            organizationId: tenant.organization.id,
            identifier: idToSuppress,
            reason: 'UNSUBSCRIBE',
            source: `reply:${inbound.id}`,
          },
        });
      }

      // Cancel all pending follow-ups immediately
      await prisma.followUpTask.updateMany({
        where: { organizationId: tenant.organization.id, leadId: msg.leadId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
    }

    return NextResponse.json({
      success: true,
      classification: result,
      inboundMessage: inbound,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Reply classification failed' }, { status: 500 });
  }
}
