"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { fail, done, type ActionState } from "@/lib/action-state";
import { rupeesToPaise } from "@/lib/money";
import { parseDateOnly } from "@/lib/dates";
import { saveUpload, mediaUrl, UploadError } from "@/lib/storage";
import { bool, int, linesFromText, optStr, slugify, specsFromText, str } from "@/lib/utils";

function revalidateCatalog(slug?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/equipment/${slug}`);
}

export async function saveProductAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("products");
  const id = str(form, "id");
  const name = str(form, "name");
  if (name.length < 2) return fail("Enter a product name.");
  const slug = slugify(str(form, "slug") || name);
  if (!slug) return fail("Enter a valid URL slug.");
  const categoryId = str(form, "categoryId");
  if (!(await db.category.findUnique({ where: { id: categoryId } }))) return fail("Choose a category.");
  const clash = await db.product.findUnique({ where: { slug } });
  if (clash && clash.id !== id) return fail("Another product already uses this URL slug.");

  const rentable = bool(form, "rentable");
  const dailyRate = rupeesToPaise(str(form, "dailyRate"));
  const weeklyRate = rupeesToPaise(str(form, "weeklyRate"));
  const monthlyRate = rupeesToPaise(str(form, "monthlyRate"));
  if (rentable && dailyRate <= 0) return fail("Rentable products need a daily rate.");
  const salePriceRaw = str(form, "salePrice");

  const data = {
    name,
    slug,
    brand: str(form, "brand") || "eSurvey",
    categoryId,
    tagline: optStr(form, "tagline"),
    description: str(form, "description"),
    specs: JSON.stringify(specsFromText(str(form, "specs"))),
    features: JSON.stringify(linesFromText(str(form, "features"))),
    tags: str(form, "tags")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .join(", "),
    datasheetUrl: optStr(form, "datasheetUrl"),
    rentable,
    dailyRate,
    weeklyRate,
    monthlyRate,
    deposit: rupeesToPaise(str(form, "deposit")),
    forSale: bool(form, "forSale"),
    salePrice: salePriceRaw ? rupeesToPaise(salePriceRaw) : null,
    featured: bool(form, "featured"),
    active: bool(form, "active"),
    sortOrder: int(form, "sortOrder", 0),
  };

  const image = form.get("image");
  let imageUrl: string | undefined;
  if (image instanceof File && image.size > 0) {
    try {
      imageUrl = mediaUrl(await saveUpload(image, "media", { allowPdf: false }));
    } catch (e) {
      return fail(e instanceof UploadError ? e.message : "Image upload failed.");
    }
  }
  if (bool(form, "removeImage")) imageUrl = "";

  if (id) {
    const before = await db.product.findUnique({ where: { id } });
    await db.product.update({ where: { id }, data: { ...data, ...(imageUrl !== undefined ? { imageUrl: imageUrl || null } : {}) } });
    revalidateCatalog(before?.slug);
    revalidateCatalog(slug);
    revalidatePath(`/admin/products/${id}`);
    return done("Product saved.");
  }
  const created = await db.product.create({ data: { ...data, imageUrl: imageUrl || null } });
  revalidateCatalog(slug);
  redirect(`/admin/products/${created.id}?created=1`);
}

export async function quickPriceAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("products");
  const id = str(form, "id");
  const product = await db.product.update({
    where: { id },
    data: {
      dailyRate: rupeesToPaise(str(form, "dailyRate")),
      weeklyRate: rupeesToPaise(str(form, "weeklyRate")),
      monthlyRate: rupeesToPaise(str(form, "monthlyRate")),
      deposit: rupeesToPaise(str(form, "deposit")),
      salePrice: str(form, "salePrice") ? rupeesToPaise(str(form, "salePrice")) : null,
    },
  });
  revalidateCatalog(product.slug);
  revalidatePath("/admin/products");
  return done("Saved");
}

export async function addUnitAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("units");
  const productId = str(form, "productId");
  const serials = str(form, "serials")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!serials.length) return fail("Enter at least one serial number.");
  const existing = await db.unit.findMany({ where: { serialNumber: { in: serials } } });
  if (existing.length) return fail(`Already in the fleet: ${existing.map((u) => u.serialNumber).join(", ")}`);
  const purchaseDate = parseDateOnly(str(form, "purchaseDate"));
  const cost = str(form, "purchaseCost");
  await db.unit.createMany({
    data: serials.map((serialNumber) => ({
      productId,
      serialNumber,
      purchaseDate,
      purchaseCost: cost ? rupeesToPaise(cost) : null,
      firmware: optStr(form, "firmware"),
    })),
  });
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/units");
  revalidateCatalog();
  return done(`${serials.length} unit${serials.length > 1 ? "s" : ""} added.`);
}

export async function updateUnitAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("units");
  const id = str(form, "id");
  const status = str(form, "status");
  if (!["ACTIVE", "MAINTENANCE", "RETIRED"].includes(status)) return fail("Choose a status.");
  const serialNumber = str(form, "serialNumber");
  if (!serialNumber) return fail("Serial number is required.");
  const clash = await db.unit.findUnique({ where: { serialNumber } });
  if (clash && clash.id !== id) return fail("Another unit has this serial number.");
  const cost = str(form, "purchaseCost");
  const unit = await db.unit.update({
    where: { id },
    data: {
      serialNumber,
      status,
      condition: str(form, "condition") || "Good",
      firmware: optStr(form, "firmware"),
      purchaseDate: parseDateOnly(str(form, "purchaseDate")),
      purchaseCost: cost ? rupeesToPaise(cost) : null,
      notes: optStr(form, "notes"),
    },
  });
  revalidatePath(`/admin/units/${id}`);
  revalidatePath(`/admin/products/${unit.productId}`);
  revalidatePath("/admin/units");
  revalidateCatalog();
  return done("Unit saved.");
}

export async function deleteUnitAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("units");
  const id = str(form, "id");
  const used = await db.bookingUnit.count({ where: { unitId: id } });
  if (used) return fail("This unit has booking history — set its status to Retired instead of deleting it.");
  const unit = await db.unit.delete({ where: { id } });
  revalidatePath(`/admin/products/${unit.productId}`);
  revalidatePath("/admin/units");
  revalidateCatalog();
  redirect(`/admin/products/${unit.productId}`);
}

export async function addMaintenanceAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const staff = await requireStaff("units");
  const unitId = str(form, "unitId");
  const kind = str(form, "kind");
  if (!["MAINTENANCE", "CALIBRATION", "REPAIR", "FIRMWARE"].includes(kind)) return fail("Choose a type.");
  const note = str(form, "note");
  if (!note) return fail("Describe the work done.");
  await db.maintenanceLog.create({
    data: {
      unitId,
      kind,
      note,
      cost: rupeesToPaise(str(form, "cost")),
      date: parseDateOnly(str(form, "date")) ?? new Date(),
      nextDue: parseDateOnly(str(form, "nextDue")),
      createdBy: staff.name,
    },
  });
  if (kind === "FIRMWARE" && optStr(form, "firmware")) {
    await db.unit.update({ where: { id: unitId }, data: { firmware: optStr(form, "firmware") } });
  }
  revalidatePath(`/admin/units/${unitId}`);
  revalidatePath("/admin/units");
  return done("Log entry added.");
}
