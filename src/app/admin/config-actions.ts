"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, requireStaff } from "@/lib/auth";
import { fail, done, type ActionState } from "@/lib/action-state";
import { rupeesToPaise } from "@/lib/money";
import { parseDateOnly } from "@/lib/dates";
import { saveSettings, SETTING_DEFAULTS, type SettingKey } from "@/lib/settings";
import { INDIAN_STATES, STAFF_ROLES } from "@/lib/constants";
import { bool, int, isValidEmail, isValidGstin, optStr, slugify, str } from "@/lib/utils";

const site = () => revalidatePath("/", "layout");

// ---- Services -------------------------------------------------------------

export async function saveServiceAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("services");
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return fail("Enter a name.");
  const data = {
    name,
    description: str(form, "description"),
    dailyRate: rupeesToPaise(str(form, "dailyRate")),
    sacCode: optStr(form, "sacCode"),
    active: bool(form, "active"),
    sortOrder: int(form, "sortOrder", 0),
  };
  if (data.dailyRate <= 0) return fail("Enter a daily rate.");
  if (id) await db.service.update({ where: { id }, data });
  else {
    const slug = slugify(name);
    if (await db.service.findUnique({ where: { slug } })) return fail("A service with this name already exists.");
    await db.service.create({ data: { ...data, slug } });
  }
  site();
  return done("Service saved.");
}

// ---- Cities ---------------------------------------------------------------

export async function saveCityAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("cities");
  const id = str(form, "id");
  const name = str(form, "name");
  const state = str(form, "state");
  if (!name) return fail("Enter the city name.");
  if (!(INDIAN_STATES as readonly string[]).includes(state)) return fail("Choose the state.");
  const pickupAvailable = bool(form, "pickupAvailable");
  const officeAddress = optStr(form, "officeAddress");
  if (pickupAvailable && !officeAddress) return fail("Add the office address for pickup.");
  const data = {
    name,
    state,
    deliveryFee: rupeesToPaise(str(form, "deliveryFee")),
    pickupAvailable,
    officeAddress,
    active: bool(form, "active"),
    sortOrder: int(form, "sortOrder", 0),
  };
  if (id) await db.city.update({ where: { id }, data });
  else await db.city.create({ data });
  site();
  return done("City saved.");
}

// ---- Coupons --------------------------------------------------------------

export async function saveCouponAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("coupons");
  const id = str(form, "id");
  const code = str(form, "code").toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return fail("Codes are 3–20 letters/numbers.");
  const percentOff = int(form, "percentOff", 0);
  const flatOff = rupeesToPaise(str(form, "flatOff"));
  if (!percentOff && !flatOff) return fail("Set a percentage or a flat discount.");
  if (percentOff && flatOff) return fail("Use either a percentage or a flat discount, not both.");
  if (percentOff < 0 || percentOff > 100) return fail("Percentage must be 1–100.");
  const maxUses = int(form, "maxUses", 0);
  const data = {
    code,
    description: optStr(form, "description"),
    percentOff: percentOff || null,
    flatOff: flatOff || null,
    minOrder: rupeesToPaise(str(form, "minOrder")),
    maxUses: maxUses > 0 ? maxUses : null,
    validFrom: parseDateOnly(str(form, "validFrom")),
    validTo: parseDateOnly(str(form, "validTo")),
    active: bool(form, "active"),
  };
  const clash = await db.coupon.findUnique({ where: { code } });
  if (clash && clash.id !== id) return fail("That code already exists.");
  if (id) await db.coupon.update({ where: { id }, data });
  else await db.coupon.create({ data });
  revalidatePath("/admin/coupons");
  return done("Coupon saved.");
}

// ---- FAQ & testimonials ---------------------------------------------------

export async function saveFaqAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("content");
  const id = str(form, "id");
  if (bool(form, "delete") && id) {
    await db.faq.delete({ where: { id } });
    site();
    return done("Deleted.");
  }
  const question = str(form, "question");
  const answer = str(form, "answer");
  if (!question || !answer) return fail("Enter a question and an answer.");
  const data = { question, answer, active: bool(form, "active"), sortOrder: int(form, "sortOrder", 0) };
  if (id) await db.faq.update({ where: { id }, data });
  else await db.faq.create({ data });
  site();
  return done("Saved.");
}

export async function saveTestimonialAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("content");
  const id = str(form, "id");
  if (bool(form, "delete") && id) {
    await db.testimonial.delete({ where: { id } });
    site();
    return done("Deleted.");
  }
  const name = str(form, "name");
  const quote = str(form, "quote");
  if (!name || !quote) return fail("Enter the customer's name and their words.");
  const rating = Math.min(5, Math.max(1, int(form, "rating", 5)));
  const data = { name, quote, company: optStr(form, "company"), rating, active: bool(form, "active"), sortOrder: int(form, "sortOrder", 0) };
  if (id) await db.testimonial.update({ where: { id }, data });
  else await db.testimonial.create({ data });
  site();
  return done("Saved.");
}

// ---- Staff ----------------------------------------------------------------

export async function saveStaffAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff("staff");
  const id = str(form, "id");
  const role = str(form, "role");
  if (!(role in STAFF_ROLES)) return fail("Choose a role.");
  if (id) {
    if (id === me.id && role !== "ADMIN") return fail("You can't remove your own admin role.");
    const disable = bool(form, "disable");
    if (id === me.id && disable) return fail("You can't disable your own account.");
    await db.user.update({ where: { id }, data: { role: disable ? "CUSTOMER" : role, blocked: disable } });
    revalidatePath("/admin/staff");
    return done(disable ? "Staff access removed." : "Role updated.");
  }
  const name = str(form, "name");
  const email = str(form, "email").toLowerCase();
  const password = str(form, "password");
  if (!name || !isValidEmail(email)) return fail("Enter a name and a valid email.");
  if (password.length < 8) return fail("Set a temporary password of at least 8 characters.");
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { role, blocked: false } });
  } else {
    await db.user.create({
      data: { name, email, phone: str(form, "phone") || "0000000000", passwordHash: await hashPassword(password), role, kycStatus: "VERIFIED" },
    });
  }
  revalidatePath("/admin/staff");
  return done(existing ? "Existing account promoted to staff." : "Staff account created. Share the temporary password securely.");
}

// ---- Settings -------------------------------------------------------------

export async function saveSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("settings");
  const values: Partial<Record<SettingKey, string>> = {};
  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
    if (form.has(key)) values[key] = str(form, key);
  }
  if (values.gstin && !isValidGstin(values.gstin)) return fail("Company GSTIN looks invalid.");
  if (values.grievanceEmail && !isValidEmail(values.grievanceEmail)) return fail("Grievance officer email looks invalid.");
  if (values.state && !(INDIAN_STATES as readonly string[]).includes(values.state)) return fail("Choose the company's state.");
  for (const k of ["gstRate", "advancePercent", "lateFeeMultiplier", "minLeadDays"] as const) {
    if (values[k] !== undefined && (!Number.isFinite(Number(values[k])) || Number(values[k]) < 0)) return fail(`${k} must be a number.`);
  }
  if (values.advancePercent && Number(values.advancePercent) > 100) return fail("Advance percent must be 0–100.");
  await saveSettings(values);
  site();
  return done("Settings saved.");
}
