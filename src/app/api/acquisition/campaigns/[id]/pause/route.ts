import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveTenantContext } from '@/lib/acquisition/tenant';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const campaign = await prisma.acquisitionCampaign.findFirst({
      where: { id: params.id, organizationId: tenant.organization.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const updated = await prisma.acquisitionCampaign.update({
      where: { id: campaign.id },
      data: { status: 'PAUSED' },
    });

    return NextResponse.json({ success: true, campaign: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to pause campaign' }, { status: 500 });
  }
}
