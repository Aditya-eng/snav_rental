// Seeds the catalog, services, cities, FAQs and the first admin account.
// Safe to re-run: existing rows are left untouched, so edits made in the admin panel survive.
// All prices and deposits below are PLACEHOLDERS — set real values in Admin → Products.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const db = new PrismaClient();
const rs = (rupees: number) => rupees * 100;

const ALL_GNSS = "GPS, BDS, GLONASS, Galileo, QZSS, NavIC, SBAS, L-Band";

type SeedProduct = {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  specs: [string, string][];
  features: string[];
  tags: string[];
  rates: [number, number, number, number]; // daily, weekly, monthly, deposit (rupees)
  featured?: boolean;
  forSale?: boolean;
  brand?: string;
};

const products: SeedProduct[] = [
  {
    slug: "esurvey-e300-pro",
    name: "eSurvey E300 Pro",
    category: "gnss-receivers",
    tagline: "Full-featured GNSS receiver",
    description:
      "eSurvey's compact all-rounder: tracks every major satellite system, measures with the pole tilted up to 60° and has a built-in UHF radio, in a 940 g magnesium-alloy body. A dependable choice for land, topographic and construction surveys.",
    specs: [
      ["GNSS channels", "1408"],
      ["Constellations", ALL_GNSS],
      ["RTK accuracy", "H: 8 mm + 1 ppm, V: 15 mm + 1 ppm (RMS)"],
      ["Tilt survey", "Up to 60° (IMU)"],
      ["Internal radio", "2 W Tx/Rx UHF, up to 15 km"],
      ["Body", "Magnesium alloy, 940 g"],
      ["Battery life", "Up to 12 hours"],
      ["Operating temperature", "-40 °C to +65 °C"],
    ],
    features: [
      "Measure points without levelling the pole (60° tilt)",
      "Built-in Tx/Rx radio — works as base or rover",
      "RTK Aid keeps you working through short correction outages",
      "Rugged, lightweight magnesium-alloy body",
    ],
    tags: ["IMU tilt", "Internal radio", "Base capable"],
    rates: [3000, 16000, 50000, 50000],
    featured: true,
  },
  {
    slug: "esurvey-e500",
    name: "eSurvey E500",
    category: "gnss-receivers",
    tagline: "Portable tilt-featured GNSS receiver",
    description:
      "An iF Design Award-winning receiver built for everyday field work. Tilt survey, an integrated Tx/Rx UHF modem and a rugged shock-resistant shell make it an efficient, budget-friendly rover.",
    specs: [
      ["Tilt survey", "Up to 60° (IMU)"],
      ["Internal radio", "Integrated Tx/Rx UHF modem"],
      ["RTK Aid", "Yes"],
      ["Battery indicator", "Real-time power display"],
      ["Design", "Rugged, shock and fall resistant"],
    ],
    features: [
      "60° tilt survey for corners and slopes",
      "Integrated radio for base–rover work without network",
      "Live battery indicator on the unit",
      "Good value for routine surveys",
    ],
    tags: ["IMU tilt", "Internal radio"],
    rates: [2500, 13500, 42000, 40000],
  },
  {
    slug: "esurvey-e600",
    name: "eSurvey E600",
    category: "gnss-receivers",
    tagline: "Versatile GNSS receiver with long-range radio",
    description:
      "The E600 pairs a powerful 2 W UHF modem with tilt survey and hot-swappable batteries, so long jobs and long base–rover baselines are no problem.",
    specs: [
      ["Tilt survey", "Up to 60° (IMU)"],
      ["Internal radio", "2 W UHF, up to 15 km"],
      ["Storage", "8 GB internal + TF card slot"],
      ["Battery", "Hot-swappable"],
    ],
    features: [
      "Up to 15 km radio range",
      "Swap batteries without powering down",
      "60° tilt survey",
      "Expandable storage for long static sessions",
    ],
    tags: ["IMU tilt", "Internal radio", "Hot-swap battery", "Base capable"],
    rates: [3000, 16000, 50000, 50000],
    featured: true,
  },
  {
    slug: "esurvey-e800",
    name: "eSurvey E800",
    category: "gnss-receivers",
    tagline: "High-performance GNSS receiver",
    description:
      "A flagship receiver with a colour touchscreen, a 5 W internal radio and a 13,600 mAh battery. Configure it on the unit itself and run it as a powerful base or a long-endurance rover.",
    specs: [
      ["Display", "1.45-inch colour touchscreen"],
      ["Internal radio", "5 W, 10–15 km working range"],
      ["Storage", "32 GB"],
      ["Battery", "13,600 mAh"],
      ["Tilt survey", "Up to 60° (IMU)"],
      ["Ingress protection", "IP67"],
      ["RTK Aid", "Yes"],
    ],
    features: [
      "Set up without a controller using the touchscreen",
      "5 W radio for long baselines",
      "All-day battery",
      "IP67 rugged design",
    ],
    tags: ["IMU tilt", "Internal radio", "Display", "Base capable"],
    rates: [3500, 19000, 60000, 60000],
    featured: true,
  },
  {
    slug: "esurvey-e800-pro",
    name: "eSurvey E800 Pro",
    category: "gnss-receivers",
    tagline: "High-performance GNSS receiver with PPP-AR",
    description:
      "The E800 Pro adds a new-generation GNSS module, PPP-AR positioning, 64 GB of storage and IP68 protection to the E800 platform.",
    specs: [
      ["Display", "1.45-inch colour touchscreen"],
      ["Internal radio", "5 W"],
      ["Storage", "64 GB"],
      ["Battery", "13,600 mAh"],
      ["Positioning", "RTK, PPP-AR"],
      ["Radio protocols", "Includes elink_Ultra"],
      ["Ingress protection", "IP68"],
    ],
    features: [
      "PPP-AR for centimetre positioning without a local base",
      "5 W radio for long baselines",
      "IP68 — dust-tight and waterproof",
      "64 GB storage for long static logging",
    ],
    tags: ["Internal radio", "Display", "PPP", "Base capable"],
    rates: [4000, 22000, 70000, 70000],
  },
  {
    slug: "esurvey-ertk10-mini",
    name: "eSurvey eRTK10 mini",
    category: "gnss-receivers",
    tagline: "Pocket-size GNSS receiver",
    description:
      "At just 380 g the eRTK10 mini is the lightest way to get RTK in the field. Tilt survey and a universal Type-C port make it ideal for GIS, utility and quick stakeout jobs.",
    specs: [
      ["Weight", "380 g"],
      ["Tilt survey", "Up to 60° (IMU)"],
      ["Bluetooth", "5.0 EDR & BLE"],
      ["Interface", "USB Type-C"],
    ],
    features: ["Ultra-light, fits in a pocket", "60° tilt survey", "Type-C charging and data"],
    tags: ["IMU tilt", "Lightweight"],
    rates: [2000, 11000, 35000, 35000],
  },
  {
    slug: "esurvey-ertk10-pro",
    name: "eSurvey eRTK10 Pro",
    category: "gnss-receivers",
    tagline: "Pocket-size AR GNSS receiver",
    description:
      "The eRTK10 Pro adds real-time AR stakeout to a pocket-size receiver: see where the pole tip needs to go on your controller's camera view. It also receives corrections over radio for sites without mobile network.",
    specs: [
      ["Tilt survey", "Up to 60° (IMU)"],
      ["Stakeout", "Real-time AR stakeout"],
      ["Radio", "UHF receive (Rx), mainstream protocols"],
      ["Design", "Compact and lightweight"],
    ],
    features: ["AR stakeout — up to 50% faster stakeout", "60° tilt survey", "Radio Rx for no-network sites"],
    tags: ["IMU tilt", "AR stakeout", "Lightweight"],
    rates: [2500, 13500, 42000, 40000],
  },
  {
    slug: "esurvey-ertk20",
    name: "eSurvey eRTK20",
    category: "gnss-receivers",
    tagline: "Visual stakeout GNSS receiver",
    description:
      "Wide-angle dual cameras, IMU tilt and CAD AR stakeout make the eRTK20 one of the fastest stakeout tools available — eSurvey quotes up to 40% faster project stakeout. Built-in UHF and 4G modems cover every correction source.",
    specs: [
      ["GNSS channels", "1408"],
      ["Constellations", ALL_GNSS],
      ["Tilt survey", "Up to 60° (IMU)"],
      ["Cameras", "Wide-angle dual cameras, CAD AR stakeout"],
      ["Communication", "Built-in Tx/Rx UHF and 4G modems"],
    ],
    features: [
      "CAD AR visual stakeout",
      "Measure points you can't physically reach using the cameras",
      "60° tilt survey",
      "UHF + 4G for radio or NTRIP/CORS corrections",
    ],
    tags: ["IMU tilt", "AR stakeout", "Visual survey", "Internal radio", "4G"],
    rates: [3500, 19000, 60000, 60000],
    featured: true,
  },
  {
    slug: "esurvey-ertk25",
    name: "eSurvey eRTK25",
    category: "gnss-receivers",
    tagline: "Visual GNSS receiver with laser precision",
    description:
      "The eRTK25 combines visual GNSS with laser-assisted measurement for points where the pole can't go, plus a 1 W radio and a wide operating temperature range.",
    specs: [
      ["GNSS channels", "1408"],
      ["Tilt survey", "Up to 60° (IMU)"],
      ["Measurement", "Visual + laser-assisted"],
      ["Internal radio", "1 W, up to 10 km"],
      ["Operating temperature", "-30 °C to +70 °C"],
    ],
    features: ["Laser-assisted measurement", "Visual survey and stakeout", "60° tilt survey", "1 W radio, up to 10 km"],
    tags: ["IMU tilt", "Visual survey", "Laser", "Internal radio"],
    rates: [4000, 22000, 70000, 70000],
  },
  {
    slug: "esurvey-ertk30",
    name: "eSurvey eRTK30",
    category: "gnss-receivers",
    tagline: "Visual GNSS receiver with dual cameras",
    description:
      "Dual-camera visual survey and stakeout on a full-constellation, 1408-channel GNSS engine with 60° tilt.",
    specs: [
      ["GNSS channels", "1408"],
      ["Constellations", ALL_GNSS],
      ["Tilt survey", "Up to 60° (IMU)"],
      ["Cameras", "Dual cameras"],
    ],
    features: ["Dual-camera visual stakeout", "Full-constellation tracking", "60° tilt survey"],
    tags: ["IMU tilt", "AR stakeout", "Visual survey"],
    rates: [3500, 19000, 60000, 60000],
  },
  {
    slug: "esurvey-ertk60",
    name: "eSurvey eRTK60",
    category: "gnss-receivers",
    tagline: "Full-featured visual GNSS receiver",
    description:
      "eSurvey's full-featured visual receiver: dual cameras, a long-range UHF modem, a colour LED display and hot-swappable batteries for uninterrupted days in the field.",
    specs: [
      ["Cameras", "Dual cameras"],
      ["Internal radio", "Long-range UHF, 1 W, up to 10 km"],
      ["Battery", "Hot-swappable"],
      ["Display", "Colour LED display"],
    ],
    features: ["Dual-camera visual stakeout", "Hot-swap batteries", "Long-range radio"],
    tags: ["Visual survey", "AR stakeout", "Internal radio", "Hot-swap battery", "Display"],
    rates: [4500, 24000, 75000, 75000],
  },
  {
    slug: "esurvey-ebase-20",
    name: "eSurvey eBase 20",
    category: "base-stations",
    tagline: "Portable GNSS base receiver",
    description:
      "A dedicated portable base with UHF radio and global 4G, managed from a phone, tablet or PC over its web interface. It alerts you if the base is disturbed or the battery runs low.",
    specs: [
      ["GNSS channels", "1408"],
      ["Constellations", "GPS, BDS, GLONASS, Galileo, QZSS, SBAS"],
      ["Communication", "UHF radio + global 4G"],
      ["Setup", "Web UI from phone, tablet or PC"],
      ["Alerts", "Base displacement, low battery, activation status"],
      ["CORS", "Smart base service, CORS compatible"],
    ],
    features: ["Instant base displacement alarm", "Web UI setup — no controller needed", "UHF and 4G corrections"],
    tags: ["Base station", "4G", "Internal radio"],
    rates: [2500, 13500, 42000, 40000],
  },
  {
    slug: "esurvey-ebase-30",
    name: "eSurvey eBase 30",
    category: "base-stations",
    tagline: "Rugged GNSS reference base receiver",
    description:
      "A rugged reference base with a 5 W radio reaching beyond 20 km in good conditions, plus 4G, a colour status display and voice alerts.",
    specs: [
      ["GNSS channels", "1408"],
      ["Constellations", "GPS, BDS, GLONASS, Galileo, QZSS, NavIC"],
      ["Internal radio", "5 W, 20+ km in optimal conditions"],
      ["Communication", "UHF radio, 4G, Bluetooth, Wi-Fi"],
      ["Display", "Colour status display with voice alarm"],
    ],
    features: ["5 W high-power radio", "4G for NTRIP / CORS", "Status display and voice alerts"],
    tags: ["Base station", "4G", "Internal radio", "Display"],
    rates: [3000, 16000, 50000, 50000],
  },
  {
    slug: "esurvey-p8iii",
    name: "eSurvey P8III Controller",
    category: "controllers",
    tagline: "High-performance rugged controller",
    description: "A rugged data collector with a full QWERTY keypad and dedicated survey keys for fast field entry.",
    specs: [
      ["Processor", "8-core 2.0 GHz"],
      ["Screen", "5.5-inch, 500 nits"],
      ["Keypad", "Full QWERTY + survey keys"],
      ["Battery", "9,000 mAh, up to 22 hours"],
      ["Storage", "Expandable up to 512 GB"],
      ["Ingress protection", "IP68, 1.5 m drop"],
    ],
    features: ["Physical keyboard", "22-hour battery", "IP68"],
    tags: ["Controller"],
    rates: [800, 4500, 14000, 15000],
  },
  {
    slug: "esurvey-p9iv",
    name: "eSurvey P9IV Controller",
    category: "controllers",
    tagline: "Professional rugged controller",
    description: "A 5-inch Android controller with a magnesium-alloy bracket, glove mode and all-day battery.",
    specs: [
      ["OS", "Android 11"],
      ["Screen", "5.0-inch HD touchscreen"],
      ["Processor", "8-core 2.0 GHz"],
      ["Battery", "6,400 mAh, up to 15 hours"],
      ["Storage", "32 GB + TF card up to 512 GB"],
      ["Ingress protection", "IP67"],
    ],
    features: ["Glove and wet-hand touch", "All-day battery", "IP67"],
    tags: ["Controller"],
    rates: [700, 4000, 12000, 12000],
  },
  {
    slug: "esurvey-p9v",
    name: "eSurvey P9V Controller",
    category: "controllers",
    tagline: "6-inch professional smart controller",
    description: "The latest 6-inch Android 14 controller, with a bright screen, fast charging and IP68 protection.",
    specs: [
      ["OS", "Android 14"],
      ["Screen", "6-inch HD, 500 nits"],
      ["Processor", "8-core 2.0 GHz"],
      ["Memory", "4 GB RAM, 64 GB storage"],
      ["Battery", "8,000 mAh, 15+ hours; full charge in 3 h"],
      ["Ingress protection", "IP68"],
    ],
    features: ["Android 14", "PD fast charging", "IP68"],
    tags: ["Controller"],
    rates: [900, 5000, 15000, 15000],
  },
  {
    slug: "esurvey-ut32",
    name: "eSurvey UT32 Tablet",
    category: "controllers",
    tagline: "8-inch rugged Android tablet",
    description: "A larger 8-inch screen for CAD stakeout, GIS and visual survey work.",
    specs: [
      ["OS", "Android 10"],
      ["Screen", "8-inch"],
      ["Memory", "4 GB RAM, 64 GB storage"],
      ["Battery", "8,200 mAh, replaceable"],
      ["Camera", "8 MP rear"],
      ["Ingress protection", "IP67"],
    ],
    features: ["Big screen for CAD and maps", "Replaceable battery", "IP67"],
    tags: ["Controller"],
    rates: [1000, 5500, 17000, 17000],
  },
  {
    slug: "tripod-tribrach-set",
    name: "Tripod + Tribrach Set",
    brand: "Accessory",
    category: "accessories",
    tagline: "For base station setup",
    description: "Heavy-duty survey tripod with tribrach and GNSS adapter for setting up a base over a known point.",
    specs: [["Includes", "Tripod, tribrach, GNSS adapter"]],
    features: ["Stable base setup", "Optical plummet tribrach"],
    tags: ["Accessory"],
    rates: [200, 1000, 3000, 3000],
    forSale: false,
  },
  {
    slug: "range-pole-bipod",
    name: "Range Pole + Bipod",
    brand: "Accessory",
    category: "accessories",
    tagline: "Rover pole with quick-level bipod",
    description: "Carbon-fibre range pole with bipod and controller bracket for rover work.",
    specs: [["Includes", "Range pole, bipod, controller bracket"]],
    features: ["Lightweight carbon fibre", "Controller bracket"],
    tags: ["Accessory"],
    rates: [150, 800, 2500, 2000],
    forSale: false,
  },
];

const categories = [
  { slug: "gnss-receivers", name: "GNSS / DGPS Receivers", description: "RTK rovers for survey, stakeout and GIS", sortOrder: 1 },
  { slug: "base-stations", name: "Base Stations", description: "Dedicated GNSS reference receivers", sortOrder: 2 },
  { slug: "controllers", name: "Field Controllers", description: "Android data collectors and tablets", sortOrder: 3 },
  { slug: "accessories", name: "Accessories", description: "Tripods, poles and field kit", sortOrder: 4 },
];

const cities: [string, string][] = [
  ["Delhi", "Delhi"],
  ["Gurugram", "Haryana"],
  ["Noida", "Uttar Pradesh"],
  ["Mumbai", "Maharashtra"],
  ["Pune", "Maharashtra"],
  ["Nagpur", "Maharashtra"],
  ["Bengaluru", "Karnataka"],
  ["Hyderabad", "Telangana"],
  ["Chennai", "Tamil Nadu"],
  ["Coimbatore", "Tamil Nadu"],
  ["Kochi", "Kerala"],
  ["Kolkata", "West Bengal"],
  ["Bhubaneswar", "Odisha"],
  ["Visakhapatnam", "Andhra Pradesh"],
  ["Ahmedabad", "Gujarat"],
  ["Jaipur", "Rajasthan"],
  ["Lucknow", "Uttar Pradesh"],
  ["Chandigarh", "Chandigarh"],
  ["Dehradun", "Uttarakhand"],
  ["Bhopal", "Madhya Pradesh"],
  ["Indore", "Madhya Pradesh"],
  ["Raipur", "Chhattisgarh"],
  ["Ranchi", "Jharkhand"],
  ["Patna", "Bihar"],
  ["Guwahati", "Assam"],
];

const faqs: [string, string][] = [
  [
    "How are daily, weekly and monthly rates applied?",
    "Pick your dates and we automatically charge the cheapest combination of monthly, weekly and daily rates. For example, a 6-day rental is billed as one week whenever that is cheaper than six daily rates.",
  ],
  [
    "Is there a security deposit?",
    "Yes. Each instrument shows its refundable deposit. It is returned after the equipment comes back and is inspected, less any late fees or damage charges.",
  ],
  [
    "What documents do I need to rent?",
    "Individuals: PAN and Aadhaar. Businesses: GST certificate and company PAN. Upload them from your account — we verify them before dispatch.",
  ],
  [
    "Do you deliver to my site?",
    "We deliver in the cities listed on our Delivery page for a flat fee per booking. Where we have an office you can also pick up and drop off the equipment yourself.",
  ],
  [
    "Can I extend my rental?",
    "Yes. Request an extension from your booking page. Once we confirm the equipment is free, the extra days are added at the best available rate.",
  ],
  [
    "Can you provide a surveyor or train my team?",
    "Yes. Add a certified DGPS operator/surveyor or an on-site trainer to your booking, charged per day.",
  ],
  [
    "Can I buy the instruments instead?",
    "Yes, every receiver we rent is also available to buy. Use “Get purchase quote” on the product page.",
  ],
  [
    "Will I get a GST invoice?",
    "Yes, every confirmed booking gets a GST invoice. Enter your GSTIN at checkout to claim input tax credit.",
  ],
];

async function main() {
  for (const c of categories) {
    await db.category.upsert({ where: { slug: c.slug }, create: c, update: {} });
  }
  const catIds = Object.fromEntries((await db.category.findMany()).map((c) => [c.slug, c.id]));

  let order = 0;
  for (const p of products) {
    order++;
    const [daily, weekly, monthly, deposit] = p.rates;
    const product = await db.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        name: p.name,
        brand: p.brand ?? "eSurvey",
        categoryId: catIds[p.category],
        tagline: p.tagline,
        description: p.description,
        specs: JSON.stringify(p.specs.map(([label, value]) => ({ label, value }))),
        features: JSON.stringify(p.features),
        tags: p.tags.join(", "),
        dailyRate: rs(daily),
        weeklyRate: rs(weekly),
        monthlyRate: rs(monthly),
        deposit: rs(deposit),
        forSale: p.forSale ?? true,
        salePrice: null,
        featured: !!p.featured,
        sortOrder: order,
      },
    });
    const serial = `DEMO-${p.slug.replace("esurvey-", "").toUpperCase()}-01`;
    await db.unit.upsert({
      where: { serialNumber: serial },
      update: {},
      create: { productId: product.id, serialNumber: serial, notes: "Placeholder unit — replace with your real serial numbers." },
    });
  }

  await db.service.upsert({
    where: { slug: "certified-operator" },
    update: {},
    create: {
      slug: "certified-operator",
      name: "Certified DGPS operator / surveyor",
      description:
        "An experienced surveyor comes to your site with the equipment, sets up base and rover, and collects data to your specification. Outstation travel and stay are quoted separately before dispatch.",
      dailyRate: rs(3000),
      sacCode: "998343",
      sortOrder: 1,
    },
  });
  await db.service.upsert({
    where: { slug: "onsite-trainer" },
    update: {},
    create: {
      slug: "onsite-trainer",
      name: "On-site trainer",
      description:
        "A trainer visits your site or office to teach your team setup, base–rover configuration, stakeout and data export on the rented instruments.",
      dailyRate: rs(2500),
      sacCode: "999293",
      sortOrder: 2,
    },
  });

  if ((await db.city.count()) === 0) {
    await db.city.createMany({
      data: cities.map(([name, state], i) => ({
        name,
        state,
        deliveryFee: rs(1500),
        pickupAvailable: name === "Delhi",
        officeAddress: name === "Delhi" ? "Office address — update in Admin → Cities" : null,
        sortOrder: i,
      })),
    });
  }

  if ((await db.faq.count()) === 0) {
    await db.faq.createMany({ data: faqs.map(([question, answer], i) => ({ question, answer, sortOrder: i })) });
  }

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@snavindia.com").toLowerCase();
  const existing = await db.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const password = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");
    await db.user.create({
      data: {
        name: "SNAV Admin",
        email: adminEmail,
        phone: "0000000000",
        role: "ADMIN",
        passwordHash: await bcrypt.hash(password, 10),
        kycStatus: "VERIFIED",
      },
    });
    console.log(`\nAdmin account created:\n  email:    ${adminEmail}\n  password: ${password}\n  (change it after first login)\n`);
  }

  console.log(`Seeded ${products.length} products, ${cities.length} cities, 2 services.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
