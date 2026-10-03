"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, hashPassword, isStaff, verifyPassword } from "@/lib/auth";
import { fail, done, type ActionState } from "@/lib/action-state";
import { isValidEmail, isValidGstin, isValidPhone, optStr, str } from "@/lib/utils";
import { emailLayout, sendEmail, siteUrl } from "@/lib/notify";

function safeNext(next: string, fallback: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, "email").toLowerCase();
  const password = str(form, "password");
  if (!email || !password) return fail("Enter your email and password.");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return fail("Incorrect email or password.");
  if (user.blocked) return fail("This account is disabled. Please contact us.");
  await createSession(user.id);
  redirect(safeNext(str(form, "next"), isStaff(user) ? "/admin" : "/account"));
}

export async function register(_prev: ActionState, form: FormData): Promise<ActionState> {
  const name = str(form, "name");
  const email = str(form, "email").toLowerCase();
  const phone = str(form, "phone");
  const password = str(form, "password");
  const accountType = str(form, "accountType") === "BUSINESS" ? "BUSINESS" : "INDIVIDUAL";
  const companyName = optStr(form, "companyName");
  const gstin = optStr(form, "gstin")?.toUpperCase() ?? null;

  if (name.length < 2) return fail("Please enter your full name.");
  if (!isValidEmail(email)) return fail("Please enter a valid email address.");
  if (!isValidPhone(phone)) return fail("Please enter a valid 10-digit mobile number.");
  if (password.length < 8) return fail("Password must be at least 8 characters.");
  if (accountType === "BUSINESS" && !companyName) return fail("Please enter your company name.");
  if (gstin && !isValidGstin(gstin)) return fail("That GSTIN doesn't look right. Please check it.");
  if (await db.user.findUnique({ where: { email } })) return fail("An account with this email already exists. Try logging in.");

  const user = await db.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash: await hashPassword(password),
      accountType,
      companyName: accountType === "BUSINESS" ? companyName : null,
      gstin: accountType === "BUSINESS" ? gstin : null,
    },
  });
  await createSession(user.id);
  await sendEmail(
    email,
    "Welcome to SNAV",
    emailLayout({
      heading: `Welcome, ${name}`,
      paragraphs: [
        "Your SNAV account is ready. Upload your KYC documents once and every future rental is quicker to dispatch.",
      ],
      cta: { label: "Upload KYC", url: siteUrl("/account/kyc") },
    }),
  );
  redirect(safeNext(str(form, "next"), "/account"));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

export async function requestPasswordReset(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, "email").toLowerCase();
  if (!isValidEmail(email)) return fail("Please enter a valid email address.");
  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    const token = crypto.randomBytes(32).toString("base64url");
    await db.passwordReset.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const url = siteUrl(`/reset-password?token=${token}`);
    if (!process.env.RESEND_API_KEY) console.info(`[email:dev] password reset link for ${email}: ${url}`);
    await sendEmail(
      email,
      "Reset your SNAV password",
      emailLayout({
        heading: "Reset your password",
        paragraphs: ["Use the button below to choose a new password. The link expires in 1 hour.", "If you didn't ask for this, you can ignore this email."],
        cta: { label: "Choose a new password", url },
      }),
    );
  }
  return done("If an account exists for that email, we've sent a reset link.");
}

export async function resetPassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  const token = str(form, "token");
  const password = str(form, "password");
  if (password.length < 8) return fail("Password must be at least 8 characters.");
  const reset = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) return fail("This reset link is invalid or has expired.");
  await db.$transaction([
    db.user.update({ where: { id: reset.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
  ]);
  await createSession(reset.userId);
  redirect("/account");
}

export async function changePassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("Please log in again.");
  const current = str(form, "current");
  const next = str(form, "password");
  if (!(await verifyPassword(current, user.passwordHash))) return fail("Your current password is incorrect.");
  if (next.length < 8) return fail("New password must be at least 8 characters.");
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return done("Password updated.");
}
