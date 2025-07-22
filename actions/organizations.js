"use server";

import { db } from "@/lib/prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * Fetch an organization the user belongs to.
 * @param idOrSlug - Optional: pass an org id ("org_...") or slug. If omitted, falls back to active org.
 */
export async function getOrganization(idOrSlug) {
  const { userId, orgId: activeOrg } = auth();
  if (!userId) throw new Error("Unauthorized");

  // (Optional) ensure user exists in your DB
  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  // Decide which identifier to use
  const identifier =
    idOrSlug?.startsWith?.("org_")
      ? { organizationId: idOrSlug }
      : idOrSlug
      ? { slug: idOrSlug }
      : activeOrg
      ? { organizationId: activeOrg }
      : null;

  if (!identifier) return null;

  // Get organization
  const organization = await clerkClient.organizations
    .getOrganization(identifier)
    .catch(() => null);
  if (!organization) return null;

  // Check membership
  const { data: memberships } =
    await clerkClient.organizations.getOrganizationMembershipList({
      organizationId: organization.id,
    });

  const isMember = memberships.some(
    (m) => m.publicUserData.userId === userId
  );
  return isMember ? organization : null;
}

export async function getProjects(orgIdParam) {
  const { userId, orgId: activeOrg } = auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  const orgId = orgIdParam ?? activeOrg;
  if (!orgId) throw new Error("No organization selected");

  return db.project.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserIssues() {
  const { userId, orgId } = auth();
  if (!userId) throw new Error("Unauthorized");
  if (!orgId) return []; // fail-soft during onboarding

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  return db.issue.findMany({
    where: {
      OR: [{ assigneeId: user.id }, { reporterId: user.id }],
      project: { organizationId: orgId },
    },
    include: {
      project: true,
      assignee: true,
      reporter: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getOrganizationUsers(orgIdParam) {
  const { userId, orgId: activeOrg } = auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  const orgId = orgIdParam ?? activeOrg;
  if (!orgId) throw new Error("No organization selected");

  const { data: memberships } =
    await clerkClient.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

  const clerkIds = memberships.map((m) => m.publicUserData.userId);

  return db.user.findMany({
    where: { clerkUserId: { in: clerkIds } },
  });
}
