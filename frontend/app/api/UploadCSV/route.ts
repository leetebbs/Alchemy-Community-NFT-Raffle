import { NextRequest, NextResponse } from 'next/server';
import { put, list, del } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const expectedKey = `Bearer ${process.env.DISCORD_API_KEY}`;
    
    if (authHeader !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV file' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const timestamp = Date.now();
    const filename = `discord_data_${timestamp}.csv`;
    
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'text/csv',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Also update a "latest" file pointer (delete then re-put to avoid conflicts)
    try {
      const existing = await list();
      const latest = existing.blobs.find(b => b.pathname === 'discord_data_latest.csv');
      if (latest) {
        await del(latest.pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
      }
    } catch (e) {
      // Listing or deletion failing shouldn't block the upload; we'll proceed to write the latest pointer.
    }

    const latestBlob = await put('discord_data_latest.csv', file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'text/csv',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({
      success: true,
      message: 'CSV uploaded successfully',
      filename,
      timestamp,
      url: blob.url,
      latestUrl: latestBlob.url,
    });
  } catch (error) {
    console.error('Error uploading CSV:', error);
    return NextResponse.json(
      { error: 'Failed to upload CSV' },
      { status: 500 }
    );
  }
}
