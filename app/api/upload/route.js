import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/requireUser';
import { uploadToR2 } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided for upload.' }, { status: 400 });
    }

    // Check file type
    const mimeType = file.type || 'image/jpeg';
    const isImage = mimeType.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|bmp|gif)$/i.test(file.name || '');
    if (!isImage) {
      return NextResponse.json({ error: 'Invalid file type. Only image files are allowed.' }, { status: 400 });
    }

    // Check file size (max 20MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 20MB limit.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadToR2({
      buffer,
      mimeType,
      originalName: file.name || 'receipt.jpg',
      folder: 'receipts',
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
      name: file.name || 'receipt.jpg',
      mimeType,
      size: buffer.length,
    });
  } catch (error) {
    console.error('Error uploading file to Cloudflare R2:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload image to Cloudflare R2.' },
      { status: 500 }
    );
  }
}
