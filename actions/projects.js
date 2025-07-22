"use server";

// projects.js — fixed
// -----------------------------------------------------------------------------
// Key tweaks (marked with [FIX]):
// 1. Use `clerkClient` as an object, not a function. [FIX]
// 2. Accept an orgId from the client and fall back to auth().orgId. [FIX]
// 3. Validate input with Zod (projectSchema). [FIX]
// 4. DRY helper to assert the caller is an org admin. [FIX]
// -----------------------------------------------------------------------------

import { db } from "@/lib/prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { projectSchema } from "@/app/lib/validators"; // <-- your Zod schema

// [FIX] Small helper to ensure the user is an admin in the org
async function assertAdmin(orgId, userId) {
  const { data: membershipList } =
    await clerkClient.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

  const me = membershipList.find((m) => m.publicUserData.userId === userId);
  if (!me) throw new Error("You are not a member of this organization");
  if (me.role !== "org:admin") {
    throw new Error("Only organization admins can perform this action");
  }
}

// [FIX] Resolve orgId from payload or active session
function resolveOrgId(payloadOrgId, activeOrgId) {
  return payloadOrgId ?? activeOrgId ?? null;
}

export async function createProject(rawData) {
  console.log("SERVER rawData:", rawData);
  const { userId, orgId: activeOrgId } = auth();   
  if (!userId) throw new Error("Unauthorized");
  console.log("SERVER auth:", { userId, activeOrgId });

  // [FIX] Validate payload with Zod
  const parsed = projectSchema.safeParse(rawData);
  console.log("SERVER parsed:", parsed);
  if (!parsed.success) {
    // Grab the first message or a generic fallback
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid input");
  }

  const { name, key, description, orgId: bodyOrgId } = parsed.data;

  // [FIX] Prefer orgId from body, fallback to active org
  const orgId = resolveOrgId(bodyOrgId, activeOrgId);
  if (!orgId) throw new Error("No Organization Selected");
  createProjectFn({ ...data, orgId: organization.id });

  // [FIX] Ensure caller is an admin of that org
  await assertAdmin(orgId, userId);

  try {
    const project = await db.project.create({
      data: {
        name,
        key,
        description: description ?? null,
        organizationId: orgId,
        // createdById: <link to your user table if needed>
      },
    });
    return project;
  } catch (error) {
    throw new Error("Error creating project: " + error.message);
  }
}

export async function getProject(projectId) {
  const { userId, orgId } = auth();
  if (!userId) throw new Error("Unauthorized");
  if (!orgId) return null; // let caller handle it

  // Optional: ensure user exists in your DB
  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      sprints: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project) throw new Error("Project not found");
  if (project.organizationId !== orgId) {
    // You can return null or throw, depending on your preference
    return null;
  }

  return project;
}

export async function deleteProject(projectId) {
  const { userId, orgId } = auth();
  if (!userId || !orgId) throw new Error("Unauthorized");

  // [FIX] Reuse the admin assertion here
  await assertAdmin(orgId, userId);

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.organizationId !== orgId) {
    throw new Error("Project not found or you don't have permission to delete it");
  }

  await db.project.delete({ where: { id: projectId } });
  return { success: true };
}
