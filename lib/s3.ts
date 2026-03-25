import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, getBucketConfig } from './aws-config';

const s3Client = createS3Client();
const { bucketName, folderPrefix } = getBucketConfig();

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  isPublic: boolean = false
): Promise<string> {
  const key = isPublic
    ? `${folderPrefix}public/uploads/${Date.now()}-${fileName}`
    : `${folderPrefix}uploads/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
  });

  await s3Client.send(command);
  return key;
}

export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic: boolean = false
): Promise<{ uploadUrl: string; cloud_storage_path: string }> {
  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${Date.now()}-${fileName}`
    : `${folderPrefix}uploads/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ContentType: contentType,
    ContentDisposition: isPublic ? 'attachment' : undefined,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return { uploadUrl, cloud_storage_path };
}

export async function getFileUrl(
  cloudStoragePath: string,
  isPublic: boolean,
  downloadFileName?: string,
  forPreview: boolean = false
): Promise<string> {
  // Dosya adını cloudStoragePath'ten çıkar
  const extractedFileName = downloadFileName || cloudStoragePath.split('/').pop() || 'document';
  
  if (isPublic) {
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloudStoragePath}`;
  }

  // Önizleme için inline, indirme için attachment kullan
  const contentDisposition = forPreview 
    ? `inline; filename="${encodeURIComponent(extractedFileName)}"`
    : `attachment; filename="${encodeURIComponent(extractedFileName)}"`;

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloudStoragePath,
    ResponseContentDisposition: contentDisposition,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteFile(cloudStoragePath: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: cloudStoragePath,
  });

  await s3Client.send(command);
}

export async function renameFile(
  oldKey: string,
  newKey: string
): Promise<void> {
  // S3'te rename yok, copy + delete yapmalıyız
  // Şimdilik sadece yeni isimle yükleme yapacağız
  // İlerleyen aşamalarda gerekirse implement edilir
}
