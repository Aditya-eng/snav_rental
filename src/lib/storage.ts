import "server-only";
import crypto from "node:crypto";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { get, put } from "@vercel/blob";

// Uploaded files go to Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production) and to
// ./storage on disk otherwise (local development). Files are never served directly: product
// images go through /api/media, KYC and inspection files through permission-checked routes.

export type Folder = "media" | "kyc" | "inspections";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const LOCAL_ROOT = path.join(process.cwd(), "storage");
const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const blobAccess = () => (process.env.BLOB_ACCESS === "public" ? "public" : "private") as "public" | "private";

export class UploadError extends Error {}

export function validateUpload(file: File, { allowPdf = true } = {}) {
  if (!file || file.size === 0) throw new UploadError("Please choose a file.");
  if (file.size > MAX_BYTES) throw new UploadError("Files must be 4 MB or smaller.");
  if (!TYPES[file.type] || (!allowPdf && file.type === "application/pdf"))
    throw new UploadError(allowPdf ? "Upload a JPG, PNG, WEBP or PDF file." : "Upload a JPG, PNG or WEBP image.");
}

/** Saves a file and returns its storage key, e.g. "kyc/3f2c….pdf". */
export async function saveUpload(file: File, folder: Folder, opts: { allowPdf?: boolean } = {}): Promise<string> {
  validateUpload(file, opts);
  const key = `${folder}/${crypto.randomUUID()}${TYPES[file.type]}`;
  if (useBlob()) {
    await put(key, file, { access: blobAccess(), contentType: file.type, addRandomSuffix: false });
  } else {
    const target = path.join(LOCAL_ROOT, key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await file.arrayBuffer()));
  }
  return key;
}

function contentTypeFor(key: string) {
  const ext = path.extname(key).toLowerCase();
  return Object.entries(TYPES).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
}

export function isSafeKey(key: string) {
  return /^(media|kyc|inspections)\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/.test(key);
}

export async function readUpload(key: string): Promise<{ body: BodyInit; contentType: string } | null> {
  if (!isSafeKey(key)) return null;
  if (useBlob()) {
    const result = await get(key, { access: blobAccess() });
    if (!result || result.statusCode !== 200) return null;
    return { body: result.stream, contentType: result.blob.contentType || contentTypeFor(key) };
  }
  try {
    const data = await readFile(path.join(LOCAL_ROOT, key));
    return { body: new Uint8Array(data), contentType: contentTypeFor(key) };
  } catch {
    return null;
  }
}

export function mediaUrl(key: string) {
  return `/api/media/${key}`;
}
