import "server-only";
import { getSettings } from "./settings";

export function siteUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Wraps plain paragraphs (and an optional button) in a simple branded email layout. */
export function emailLayout(opts: { heading: string; paragraphs: string[]; cta?: { label: string; url: string } }) {
  const body = opts.paragraphs.map((p) => `<p style="margin:0 0 12px;line-height:1.5">${escapeHtml(p)}</p>`).join("");
  const cta = opts.cta
    ? `<p style="margin:20px 0"><a href="${opts.cta.url}" style="background:#ea580c;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">${escapeHtml(opts.cta.label)}</a></p>`
    : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:560px;margin:0 auto">
  <div style="background:#0b1f3a;color:#fff;padding:16px 20px;font-weight:700;font-size:18px;border-radius:8px 8px 0 0">SNAV</div>
  <div style="border:1px solid #e2e8f0;border-top:0;padding:20px;border-radius:0 0 8px 8px">
    <h2 style="margin:0 0 12px;font-size:18px">${escapeHtml(opts.heading)}</h2>${body}${cta}
  </div></div>`;
}

/**
 * Sends an email through Resend when RESEND_API_KEY is set. Without a key the message is
 * logged to the server console so flows can be tested locally.
 */
export async function sendEmail(to: string | null | undefined, subject: string, html: string) {
  if (!to) return;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email:dev] to=${to} subject="${subject}"`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || "SNAV <no-reply@snavindia.com>", to, subject, html }),
    });
    if (!res.ok) console.error("[email] Resend error", res.status, await res.text());
  } catch (err) {
    console.error("[email] send failed", err);
  }
}

export async function notifyAdmin(subject: string, paragraphs: string[], ctaPath?: string) {
  const settings = await getSettings();
  const to = settings.adminEmail || process.env.ADMIN_EMAIL;
  await sendEmail(
    to,
    subject,
    emailLayout({ heading: subject, paragraphs, cta: ctaPath ? { label: "Open in admin", url: siteUrl(ctaPath) } : undefined }),
  );
}
