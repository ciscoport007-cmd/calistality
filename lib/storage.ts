import fs from 'fs';
import path from 'path';

// Public files: public/uploads/ → served as /uploads/ by Next.js
// Private files: uploads/ (project root, outside public/) → served via /api/files/
const PRIVATE_DIR = path.join(process.cwd(), 'uploads');
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'uploads');

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildKey(fileName: string, isPublic: boolean): string {
  const timestamp = Date.now();
  const safeName = path.basename(fileName);
  return isPublic
    ? `public/uploads/${timestamp}-${safeName}`
    : `uploads/${timestamp}-${safeName}`;
}

function absolutePath(key: string): string {
  return path.join(process.cwd(), key);
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  isPublic: boolean = false
): Promise<string> {
  const key = buildKey(fileName, isPublic);
  const abs = absolutePath(key);
  ensureDir(path.dirname(abs));
  fs.writeFileSync(abs, buffer);
  return key;
}

export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic: boolean = false
): Promise<{ uploadUrl: string; cloud_storage_path: string }> {
  const cloud_storage_path = buildKey(fileName, isPublic);
  // Relative URL — always points to the same origin the browser is connected to
  const uploadUrl = `/api/upload/local?path=${encodeURIComponent(cloud_storage_path)}`;
  return { uploadUrl, cloud_storage_path };
}

export async function getFileUrl(
  cloudStoragePath: string,
  isPublic: boolean,
  downloadFileName?: string,
  forPreview: boolean = false
): Promise<string> {
  if (isPublic) {
    // Strip "public/" prefix — Next.js serves public/ as root
    const rel = cloudStoragePath.replace(/^public\//, '/');
    return rel.startsWith('/') ? rel : `/${rel}`;
  }

  const namePart = downloadFileName
    ? `&filename=${encodeURIComponent(downloadFileName)}`
    : '';
  const previewPart = forPreview ? '&preview=1' : '';
  return `/api/files/${encodeURIComponent(cloudStoragePath)}?dl=1${namePart}${previewPart}`;
}

export async function deleteFile(cloudStoragePath: string): Promise<void> {
  const abs = absolutePath(cloudStoragePath);
  if (fs.existsSync(abs)) {
    fs.unlinkSync(abs);
  }
}

export async function renameFile(oldKey: string, newKey: string): Promise<void> {
  const oldAbs = absolutePath(oldKey);
  const newAbs = absolutePath(newKey);
  if (fs.existsSync(oldAbs)) {
    ensureDir(path.dirname(newAbs));
    fs.renameSync(oldAbs, newAbs);
  }
}
