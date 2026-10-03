import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { canAccess, type Section } from "./permissions";

const COOKIE = "snav_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (32+ characters)");
    return new TextEncoder().encode("dev-only-secret-change-me-dev-only-secret");
  }
  return new TextEncoder().encode(value);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** The signed-in user for this request, or null. */
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const user = await db.user.findUnique({ where: { id: payload.sub } });
    return user && !user.blocked ? user : null;
  } catch {
    return null;
  }
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function isStaff(user: { role: string } | null | undefined) {
  return !!user && user.role !== "CUSTOMER";
}

export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

/** Staff member allowed into the given admin section; redirects otherwise. */
export async function requireStaff(section: Section = "dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isStaff(user)) redirect("/");
  if (!canAccess(user.role, section)) redirect("/admin?denied=1");
  return user;
}
