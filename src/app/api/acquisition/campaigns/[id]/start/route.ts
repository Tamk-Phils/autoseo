import { NextResponse } from 'next/server';
import { resolveTenantContext } from '@/lib/acquisition/tenant';
import { executeDiscoveryCampaign } from '@/lib/acquisition/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const result = await executeDiscoveryCampaign(params.id, tenant);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to run discovery campaign' }, { status: 400 });
  }
}
