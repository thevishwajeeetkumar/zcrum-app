// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtected = createRouteMatcher([
  "/organization(.*)",
  "/project(.*)",
  "/issue(.*)",
  "/sprint(.*)",
]);

const ALLOWED_NO_ORG = ["/", "/onboarding", "/sign-in", "/sign-up", "/api"];

export default clerkMiddleware((auth, req) => {
  const { userId, orgId } = auth();
  const pathname = req.nextUrl.pathname;

  // Not signed in + accessing protected route
  if (!userId && isProtected(req)) {
    return auth().redirectToSignIn();
  }

  // Signed in but no org selected
  const onAllowedNoOrg = ALLOWED_NO_ORG.some((p) => pathname.startsWith(p));
  if (userId && !orgId && !onAllowedNoOrg) {
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
