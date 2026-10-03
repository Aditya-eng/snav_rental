"use server";

import { db } from "@/lib/db";
import { parseDateOnly, rentalDays } from "@/lib/dates";
import { availableQuantities } from "@/lib/availability";
import { buildQuote, type CartInput, type Quote } from "@/lib/quote";
import { fail, done, type ActionState } from "@/lib/action-state";
import { isValidEmail, isValidPhone, optStr, str, int } from "@/lib/utils";
import { notifyAdmin } from "@/lib/notify";
import { ENQUIRY_KIND, MAX_RENTAL_DAYS } from "@/lib/constants";

export async function checkAvailability(productId: string, start: string, end: string) {
  const s = parseDateOnly(start);
  const e = parseDateOnly(end);
  if (!s || !e || e < s || rentalDays(s, e) > MAX_RENTAL_DAYS) return { available: null as number | null };
  const map = await availableQuantities([productId], s, e);
  return { available: map.get(productId) ?? 0 };
}

export async function getQuote(input: CartInput): Promise<Quote> {
  return buildQuote(input);
}

export async function submitEnquiry(_prev: ActionState, form: FormData): Promise<ActionState> {
  const kind = str(form, "kind");
  const name = str(form, "name");
  const email = str(form, "email").toLowerCase();
  const phone = str(form, "phone");
  const message = str(form, "message");
  if (!(kind in ENQUIRY_KIND)) return fail("Please choose what your enquiry is about.");
  if (!name) return fail("Please enter your name.");
  if (!isValidEmail(email)) return fail("Please enter a valid email address.");
  if (!isValidPhone(phone)) return fail("Please enter a valid 10-digit mobile number.");
  if (!message && kind === "GENERAL") return fail("Please tell us how we can help.");

  const productSlug = optStr(form, "product");
  const product = productSlug ? await db.product.findUnique({ where: { slug: productSlug } }) : null;
  const quantity = int(form, "quantity", 0);

  await db.enquiry.create({
    data: {
      kind,
      name: name.slice(0, 120),
      email,
      phone,
      company: optStr(form, "company")?.slice(0, 160) ?? null,
      city: optStr(form, "city")?.slice(0, 80) ?? null,
      productId: product?.id ?? null,
      quantity: quantity > 0 ? Math.min(quantity, 1000) : null,
      duration: optStr(form, "duration")?.slice(0, 80) ?? null,
      startDate: parseDateOnly(str(form, "startDate")),
      message: message.slice(0, 4000),
    },
  });

  await notifyAdmin(
    `New ${ENQUIRY_KIND[kind].toLowerCase()} enquiry from ${name}`,
    [
      `${name} (${phone}, ${email})${product ? ` asked about ${product.name}` : ""}.`,
      message || "(no message)",
    ],
    "/admin/enquiries",
  );
  return done("Thanks! We've received your enquiry and will get back to you shortly.");
}
