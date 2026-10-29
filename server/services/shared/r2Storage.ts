import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim();
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim();
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim();
const R2_BUCKET_NAME = (process.env.R2_BUCKET_NAME || 'hemi-profile-storage').trim();
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.trim();

export const isR2Enabled = Boolean(
  R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    !R2_ACCOUNT_ID.includes('your_')
);

export function isR2Configured(): boolean {
  return isR2Enabled;
}

let r2Client: S3Client | null = null;

if (isR2Enabled) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
  console.log('[R2] Client initialized for bucket:', R2_BUCKET_NAME);
}

export async function uploadAvatar(
  walletAddress: string,
  imageBuffer: Buffer,
  contentType: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const cleanWallet = (walletAddress || 'player').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const mime = contentType || 'image/jpeg';

  if (isR2Enabled && r2Client) {
    try {
      const key = `avatars/${cleanWallet}.jpg`;

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: imageBuffer,
        ContentType: mime,
        CacheControl: 'public, max-age=31536000',
      });

      await r2Client.send(command);

      const baseUrl =
        R2_PUBLIC_URL || `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      const publicUrl = `${baseUrl}/${key}`;

      return { success: true, url: publicUrl };
    } catch (err: any) {
      console.warn(`[R2] Remote upload failed for ${cleanWallet}, using local storage:`, err.message);
    }
  }

  // Built-in local persistence fallback (saves file to public/uploads/avatars and returns data URL)
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
    const filePath = path.join(uploadsDir, `${cleanWallet}.${ext}`);
    fs.writeFileSync(filePath, imageBuffer);
  } catch (fsErr: any) {
    console.warn('[Storage] Local file write warning:', fsErr.message);
  }

  const dataUrl = `data:${mime};base64,${imageBuffer.toString('base64')}`;
  return { success: true, url: dataUrl };
}

export const uploadAvatarToR2 = uploadAvatar;

