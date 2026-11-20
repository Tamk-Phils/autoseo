import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export type WorkspaceType = 'SUBSCRIBER' | 'INTERNAL';
export type PlanTier = 'STARTER' | 'PROFESSIONAL' | 'BUSINESS' | 'INTERNAL_UNLIMITED';
export type AcquisitionOperation = 'DISCOVERY' | 'AUDIT' | 'PROPOSAL' | 'OUTREACH' | 'EXPORT';

export interface PlanLimits {
  discoveryCreditsPerMonth: number;
  auditsPerMonth: number;
  proposalsPerMonth: number;
  outreachPerMonth: number;
  exportLimit: number;
  teamMembers: number;
  automatedFollowUps: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  STARTER: {
    discoveryCreditsPerMonth: 50,
    auditsPerMonth: 25,
    proposalsPerMonth: 10,
    outreachPerMonth: 25,
    exportLimit: 50,
    teamMembers: 1,
    automatedFollowUps: false,
  },
  PROFESSIONAL: {
    discoveryCreditsPerMonth: 300,
    auditsPerMonth: 150,
    proposalsPerMonth: 100,
    outreachPerMonth: 200,
    exportLimit: 500,
    teamMembers: 3,
    automatedFollowUps: true,
  },
  BUSINESS: {
    discoveryCreditsPerMonth: 1500,
    auditsPerMonth: 750,
    proposalsPerMonth: 500,
    outreachPerMonth: 1000,
    exportLimit: 5000,
    teamMembers: 10,
    automatedFollowUps: true,
  },
  INTERNAL_UNLIMITED: {
    discoveryCreditsPerMonth: 1000000,
    auditsPerMonth: 1000000,
    proposalsPerMonth: 1000000,
    outreachPerMonth: 1000000,
    exportLimit: 1000000,
    teamMembers: 100,
    automatedFollowUps: true,
  },
};

export interface TenantContext {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  organization: {
    id: string;
    name: string;
    type: WorkspaceType;
    plan: PlanTier;
  };
  isAdmin: boolean;
  limits: PlanLimits;
}

const WORKSPACE_COOKIE = 'apex_acq_workspace';

/**
 * Checks whether a user is authorized to access the Internal AutoSEO workspace.
 */
export async function isInternalAdminUser(userId: string, email: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.includes(email.toLowerCase())) {
    return true;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, createdAt: true },
  });

  if (dbUser?.role === 'ADMIN' || dbUser?.role === 'SUPER_ADMIN') {
    return true;
  }

  // First registered platform owner is automatically granted internal workspace access
  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  return firstUser?.id === userId;
}

/**
 * Strictly resolves the authenticated user and their tenant-isolated organization
 * from server-side session state (never trusting frontend tenant IDs).
 */
export async function resolveTenantContext(requestedWorkspace?: WorkspaceType): Promise<TenantContext | null> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!dbUser) return null;

  const isAdmin = await isInternalAdminUser(dbUser.id, dbUser.email);

  let desiredWorkspace: WorkspaceType = 'SUBSCRIBER';
  if (requestedWorkspace === 'INTERNAL' && isAdmin) {
    desiredWorkspace = 'INTERNAL';
  } else if (!requestedWorkspace) {
    try {
      const cookieStore = cookies();
      const wsCookie = cookieStore.get(WORKSPACE_COOKIE)?.value;
      if (wsCookie === 'INTERNAL' && isAdmin) {
        desiredWorkspace = 'INTERNAL';
      }
    } catch {
      // Outside request cookie context
    }
  }

  let org = null;

  if (desiredWorkspace === 'INTERNAL' && isAdmin) {
    org = await prisma.organization.findFirst({
      where: { type: 'INTERNAL' },
    });

    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'AutoSEO Internal Acquisition',
          type: 'INTERNAL',
          plan: 'INTERNAL_UNLIMITED',
          ownerId: dbUser.id,
          members: {
            create: {
              userId: dbUser.id,
              role: 'OWNER',
            },
          },
        },
      });
    } else {
      // Ensure admin is a member
      await prisma.organizationMember.upsert({
        where: { organizationId_userId: { organizationId: org.id, userId: dbUser.id } },
        update: {},
        create: { organizationId: org.id, userId: dbUser.id, role: 'ADMIN' },
      });
    }
  } else {
    // Subscriber workspace: strictly find or provision the user's own organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: dbUser.id,
        organization: { type: 'SUBSCRIBER' },
      },
      include: { organization: true },
    });

    if (membership?.organization) {
      org = membership.organization;
    } else {
      org = await prisma.organization.findFirst({
        where: { ownerId: dbUser.id, type: 'SUBSCRIBER' },
      });

      if (!org) {
        const sub = await prisma.subscription.findUnique({ where: { userId: dbUser.id } });
        const mappedPlan: PlanTier =
          sub?.plan === 'BUSINESS' || sub?.plan === 'AGENCY' || sub?.plan === 'ENTERPRISE'
            ? 'BUSINESS'
            : sub?.plan === 'PROFESSIONAL'
            ? 'PROFESSIONAL'
            : 'STARTER';

        org = await prisma.organization.create({
          data: {
            name: dbUser.name ? `${dbUser.name}'s Workspace` : `${dbUser.email.split('@')[0]} Workspace`,
            type: 'SUBSCRIBER',
            plan: mappedPlan,
            ownerId: dbUser.id,
            members: {
              create: {
                userId: dbUser.id,
                role: 'OWNER',
              },
            },
          },
        });
      } else {
        await prisma.organizationMember.upsert({
          where: { organizationId_userId: { organizationId: org.id, userId: dbUser.id } },
          update: {},
          create: { organizationId: org.id, userId: dbUser.id, role: 'OWNER' },
        });
      }
    }
  }

  const planTier = (PLAN_LIMITS[org.plan as PlanTier] ? org.plan : 'STARTER') as PlanTier;

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: isAdmin ? 'ADMIN' : dbUser.role,
    },
    organization: {
      id: org.id,
      name: org.name,
      type: (org.type === 'INTERNAL' ? 'INTERNAL' : 'SUBSCRIBER') as WorkspaceType,
      plan: planTier,
    },
    isAdmin,
    limits: PLAN_LIMITS[planTier],
  };
}

/**
 * Returns monthly usage counters for an organization.
 */
export async function getMonthlyUsage(organizationId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const logs = await prisma.acquisitionUsageLog.findMany({
    where: {
      organizationId,
      createdAt: { gte: startOfMonth },
    },
    select: {
      operation: true,
      creditsCharged: true,
      estimatedCostUsd: true,
    },
  });

  const totals = {
    DISCOVERY: 0,
    AUDIT: 0,
    PROPOSAL: 0,
    OUTREACH: 0,
    EXPORT: 0,
    totalEstimatedCostUsd: 0,
  };

  for (const log of logs) {
    const op = log.operation as AcquisitionOperation;
    if (op in totals) {
      totals[op] += log.creditsCharged;
    }
    totals.totalEstimatedCostUsd += log.estimatedCostUsd || 0;
  }

  totals.totalEstimatedCostUsd = Number(totals.totalEstimatedCostUsd.toFixed(4));
  return totals;
}

/**
 * Server-side credit enforcement before running billable operations.
 * Internal workspace is never blocked by subscriber credits (tracked as operational expense).
 */
export async function checkCreditAllowance(
  tenant: TenantContext,
  operation: AcquisitionOperation,
  requestedUnits: number = 1
): Promise<{ allowed: boolean; remaining: number; limit: number; used: number; reason?: string }> {
  if (tenant.organization.type === 'INTERNAL') {
    return { allowed: true, remaining: 999999, limit: 1000000, used: 0 };
  }

  const usage = await getMonthlyUsage(tenant.organization.id);
  const limitMap: Record<AcquisitionOperation, number> = {
    DISCOVERY: tenant.limits.discoveryCreditsPerMonth,
    AUDIT: tenant.limits.auditsPerMonth,
    PROPOSAL: tenant.limits.proposalsPerMonth,
    OUTREACH: tenant.limits.outreachPerMonth,
    EXPORT: tenant.limits.exportLimit,
  };

  const limit = limitMap[operation];
  const used = usage[operation];
  const remaining = Math.max(0, limit - used);

  if (used + requestedUnits > limit) {
    return {
      allowed: false,
      remaining,
      limit,
      used,
      reason: `Monthly ${operation.toLowerCase()} credit limit reached (${used}/${limit} on ${tenant.organization.plan} plan).`,
    };
  }

  return { allowed: true, remaining, limit, used };
}

/**
 * Records server-side credit consumption after a successful non-duplicate operation.
 */
export async function recordUsage(params: {
  organizationId: string;
  userId?: string;
  operation: AcquisitionOperation;
  creditsCharged?: number;
  aiProvider?: string;
  estimatedCostUsd?: number;
  referenceId?: string;
}) {
  return prisma.acquisitionUsageLog.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId || null,
      operation: params.operation,
      creditsCharged: params.creditsCharged ?? 1,
      aiProvider: params.aiProvider || null,
      estimatedCostUsd: params.estimatedCostUsd ?? 0,
      referenceId: params.referenceId || null,
    },
  });
}
