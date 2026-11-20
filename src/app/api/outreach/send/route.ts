import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveTenantContext, checkCreditAllowance, recordUsage } from '@/lib/acquisition/tenant';

export const dynamic = 'force-dynamic';

/**
 * Dispatches ONLY human-approved outreach messages after checking suppression lists,
 * frequency limits, and credit allowances.
 */
export async function POST(req: Request) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    const msg = await prisma.outreachMessage.findFirst({
      where: { id: messageId, organizationId: tenant.organization.id },
      include: { lead: true },
    });

    if (!msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (msg.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Human approval is required before sending outreach. Approve the draft first.' },
        { status: 400 }
      );
    }

    if (msg.lead.isOptedOut || msg.lead.status === 'UNSUBSCRIBED') {
      return NextResponse.json({ error: 'Lead is unsubscribed/opted out. Sending blocked.' }, { status: 400 });
    }

    // Suppression list double-check
    const checks = [msg.lead.publicEmail?.toLowerCase(), msg.lead.normalizedDomain].filter(Boolean) as string[];
    if (checks.length > 0) {
      const suppressed = await prisma.suppressionEntry.findFirst({
        where: { organizationId: tenant.organization.id, identifier: { in: checks } },
      });
      if (suppressed) {
        return NextResponse.json(
          { error: `Sending blocked: contact is suppressed (${suppressed.reason}).` },
          { status: 400 }
        );
      }
    }

    // Frequency limit guard: prevent duplicate outreach to same lead within 48 hours
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentSent = await prisma.outreachMessage.findFirst({
      where: {
        organizationId: tenant.organization.id,
        leadId: msg.leadId,
        status: 'SENT',
        sentAt: { gte: fortyEightHoursAgo },
      },
    });
    if (recentSent) {
      return NextResponse.json(
        { error: 'Frequency safeguard: this prospect was already contacted within the last 48 hours.' },
        { status: 429 }
      );
    }

    const creditCheck = await checkCreditAllowance(tenant, 'OUTREACH', 1);
    if (!creditCheck.allowed) {
      return NextResponse.json({ error: creditCheck.reason }, { status: 402 });
    }

    // Optional live email delivery via Resend API if configured & lead has email
    let deliveryMode = 'AUTHORIZED_DISPATCH_LOGGED';
    let providerResponse: any = null;

    if (msg.channel === 'EMAIL' && msg.lead.publicEmail && process.env.RESEND_API_KEY) {
      try {
        const fromAddr = process.env.OUTREACH_FROM_EMAIL || 'outreach@autoseo.app';
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddr,
            to: [msg.lead.publicEmail],
            subject: msg.subject || `SEO Assessment for ${msg.lead.businessName}`,
            text: msg.body,
          }),
          signal: AbortSignal.timeout(10000),
        });
        providerResponse = await resendRes.json().catch(() => null);
        if (resendRes.ok) {
          deliveryMode = 'RESEND_EMAIL_DELIVERED';
        }
      } catch {
        // Keep logged status if external email provider fails
      }
    }

    const now = new Date();
    const updated = await prisma.outreachMessage.update({
      where: { id: msg.id },
      data: {
        status: 'SENT',
        sentAt: now,
        deliveryMetadata: JSON.stringify({
          deliveryMode,
          recipient: msg.lead.publicEmail || msg.lead.publicPhone || 'manual-channel',
          providerResponse,
        }),
      },
    });

    // Update lead status & schedule a polite follow-up in 4 days
    const followUpDue = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    await prisma.lead.update({
      where: { id: msg.leadId },
      data: {
        status: ['INTERESTED', 'CONVERTED'].includes(msg.lead.status) ? msg.lead.status : 'CONTACTED',
        lastInteractionAt: now,
        nextFollowUpAt: followUpDue,
      },
    });

    await prisma.followUpTask.create({
      data: {
        organizationId: tenant.organization.id,
        leadId: msg.leadId,
        assignedUserId: tenant.user.id,
        title: `Follow up with ${msg.lead.businessName}`,
        notes: `Check for reply to "${msg.subject || 'SEO Proposal'}". Do not send if unsubscribed.`,
        dueAt: followUpDue,
        status: 'PENDING',
      },
    });

    await recordUsage({
      organizationId: tenant.organization.id,
      userId: tenant.user.id,
      operation: 'OUTREACH',
      creditsCharged: 1,
      referenceId: updated.id,
    });

    return NextResponse.json({
      success: true,
      deliveryMode,
      message: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send outreach' }, { status: 500 });
  }
}
