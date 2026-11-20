import { NextResponse } from 'next/server';
import { resolveTenantContext } from '@/lib/acquisition/tenant';
import { auditAndScoreLead } from '@/lib/acquisition/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const result = await auditAndScoreLead(params.id, tenant, {
      runPageSpeed: Boolean(body.runPageSpeed),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to analyse lead' }, { status: 400 });
  }
}
