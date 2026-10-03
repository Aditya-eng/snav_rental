export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

export type Tone = "amber" | "blue" | "violet" | "slate" | "green" | "red";

export const BOOKING_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING_PAYMENT: { label: "Awaiting payment", tone: "amber" },
  REQUESTED: { label: "Requested", tone: "amber" },
  CONFIRMED: { label: "Confirmed", tone: "blue" },
  DISPATCHED: { label: "On rent", tone: "violet" },
  RETURNED: { label: "Returned", tone: "slate" },
  COMPLETED: { label: "Completed", tone: "green" },
  CANCELLED: { label: "Cancelled", tone: "red" },
};

export const KYC_STATUS: Record<string, { label: string; tone: Tone }> = {
  NOT_SUBMITTED: { label: "Not submitted", tone: "slate" },
  PENDING: { label: "Under review", tone: "amber" },
  VERIFIED: { label: "Verified", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
};

export const KYC_DOC_TYPES: Record<string, string> = {
  PAN: "PAN card",
  AADHAAR: "Aadhaar card",
  GST: "GST registration certificate",
  COMPANY: "Company registration / letterhead",
  OTHER: "Other photo ID",
};

export const UNIT_STATUS: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: "In fleet", tone: "green" },
  MAINTENANCE: { label: "Maintenance", tone: "amber" },
  RETIRED: { label: "Retired", tone: "slate" },
};

export const ENQUIRY_KIND: Record<string, string> = {
  RENTAL_QUOTE: "Rental quote",
  PURCHASE: "Purchase",
  GENERAL: "General",
};

export const PAYMENT_METHODS: Record<string, string> = {
  RAZORPAY: "Online (Razorpay)",
  UPI: "UPI",
  BANK: "Bank transfer",
  CASH: "Cash",
  CHEQUE: "Cheque",
};

export const STAFF_ROLES = {
  ADMIN: "Owner / Admin",
  OPERATIONS: "Operations",
  ACCOUNTS: "Accounts",
} as const;

export type StaffRole = keyof typeof STAFF_ROLES;

export const DISPATCH_CHECKLIST = [
  "Receiver(s) power on and get a fix",
  "Controller(s) charged and paired",
  "Batteries and chargers packed",
  "Radio / antennas packed",
  "Range pole / tripod / tribrach packed",
  "Cables and carry case",
  "Firmware version noted",
  "Physical condition photographed",
];

export const RETURN_CHECKLIST = [
  "All items received",
  "Receiver(s) power on and get a fix",
  "Controller(s) working",
  "Batteries and chargers returned",
  "Radio / antennas returned",
  "Accessories returned",
  "No physical damage",
  "Data / projects cleared from device",
];

/** Unpaid online bookings hold stock for this long before releasing it. */
export const PAYMENT_HOLD_MINUTES = 30;

/** Longest rental that can be booked online in one go. */
export const MAX_RENTAL_DAYS = 365;
