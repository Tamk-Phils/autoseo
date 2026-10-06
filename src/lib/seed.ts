import prisma from './db';

/**
 * Ensures a default system user exists for multi-tenant isolation, without inserting any mock/fake projects or fake crawl results.
 */
export async function ensureDefaultUser() {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'user@seo.engine',
        name: 'Workspace Owner',
      },
    });
  }
  return user;
}

export async function getDefaultProject() {
  await ensureDefaultUser();
  const project = await prisma.project.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  return project;
}
