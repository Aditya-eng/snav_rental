import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://snavindia.com"),
  title: {
    default: "SNAV — DGPS & GNSS Receivers on Rent and for Sale in India",
    template: "%s | SNAV",
  },
  description:
    "Rent eSurvey DGPS / GNSS RTK receivers by the day, week or month, with delivery across India. Certified operators and on-site training available. Also available to buy.",
  keywords: ["DGPS on rent", "GNSS receiver rental", "eSurvey E300 Pro", "RTK rover rent", "DGPS survey India", "SNAV"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
