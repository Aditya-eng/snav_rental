export type Section =
  | "dashboard"
  | "bookings"
  | "payments"
  | "calendar"
  | "products"
  | "units"
  | "services"
  | "cities"
  | "customers"
  | "enquiries"
  | "tickets"
  | "coupons"
  | "content"
  | "reports"
  | "staff"
  | "settings";

const ACCESS: Record<string, Section[] | "all"> = {
  ADMIN: "all",
  OPERATIONS: ["dashboard", "bookings", "calendar", "products", "units", "customers", "enquiries", "tickets"],
  ACCOUNTS: ["dashboard", "bookings", "payments", "customers", "coupons", "reports", "enquiries"],
};

export function canAccess(role: string, section: Section): boolean {
  const allowed = ACCESS[role];
  if (!allowed) return false;
  return allowed === "all" || allowed.includes(section);
}
