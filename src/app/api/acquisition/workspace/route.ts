import { NextResponse } from 'next/server';
import { resolveTenantContext, getMonthlyUsage, WorkspaceType } from '@/lib/acquisition/tenant';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tenant = await resolveTenantContext();
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const usage = await getMonthlyUsage(tenant.organization.id);

    return NextResponse.json({
      success: true,
      workspace: tenant.organization,
      isAdmin: tenant.isAdmin,
      limits: tenant.limits,
      usage,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load workspace' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const requested = body.workspaceType === 'INTERNAL' ? 'INTERNAL' : 'SUBSCRIBER';

    const tenant = await resolveTenantContext(requested as WorkspaceType);
    if (!tenant) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (requested === 'INTERNAL' && !tenant.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Internal AutoSEO workspace is restricted to platform administrators.' },
        { status: 403 }
      );
    }

    const usage = await getMonthlyUsage(tenant.organization.id);
    const res = NextResponse.json({
      success: true,
      workspace: tenant.organization,
      isAdmin: tenant.isAdmin,
      limits: tenant.limits,
      usage,
    });

    res.cookies.set('apex_acq_workspace', tenant.organization.type, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to switch workspace' }, { status: 500 });
  }
}
