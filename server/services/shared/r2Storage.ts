import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'hemi-profile-storage';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

export const isR2Enabled = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
export const isR2Configured = isR2Enabled;

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
  if (!isR2Enabled || !r2Client) {
    return { success: false, error: 'R2 storage not configured' };
  }

  try {
    const key = `avatars/${walletAddress.toLowerCase()}.jpg`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    });

    await r2Client.send(command);

    const baseUrl = R2_PUBLIC_URL || `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const publicUrl = `${baseUrl}/${key}`;

    return { success: true, url: publicUrl };
  } catch (err: any) {
    console.error(`[R2] Upload failed for ${walletAddress}:`, err.message);
    return { success: false, error: err.message };
  }
}

export const uploadAvatarToR2 = uploadAvatar;

