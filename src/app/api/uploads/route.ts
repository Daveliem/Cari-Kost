import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('images');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const imageUrls: string[] = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = path.extname(file.name) || '.jpg';
      const safeName = `${Date.now()}-${randomUUID()}${ext}`;
      const destination = path.join(uploadDir, safeName);
      await fs.writeFile(destination, buffer);
      imageUrls.push(`/uploads/${safeName}`);
    }

    return NextResponse.json({ images: imageUrls });
  } catch (error) {
    return NextResponse.json({ error: 'Upload gagal' }, { status: 500 });
  }
}
