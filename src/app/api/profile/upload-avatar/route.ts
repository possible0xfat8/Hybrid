import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { upsertCrazy8Profile } from '@/lib/server/supabase';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'hemi-profile-storage';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const isR2Enabled = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);

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
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { address, accountId, image, contentType } = body;

    if (!image) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    const cleanAddr = address ? address.trim().toLowerCase() : '';
    let avatarUrl = image;

    if (isR2Enabled && r2Client) {
      let mimeType = contentType || 'image/png';
      let base64Data = image;

      if (image.startsWith('data:')) {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const key = `avatars/${cleanAddr || 'player'}.jpg`;

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000',
      });

      await r2Client.send(command);
      const baseUrl = R2_PUBLIC_URL || `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      avatarUrl = `${baseUrl}/${key}`;
    }

    // Save avatar to Supabase profile
    const targetId = accountId || (cleanAddr ? `wallet_${cleanAddr}` : '');
    let updatedUser = null;
    if (targetId || cleanAddr) {
      updatedUser = await upsertCrazy8Profile({
        id: targetId,
        address: cleanAddr,
        avatar: avatarUrl,
      });
    }

    return NextResponse.json({
      success: true,
      avatarUrl,
      user: updatedUser,
    });
  } catch (err: any) {
    console.error('[API:UploadAvatar] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error uploading avatar' },
      { status: 500 }
    );
  }
}
