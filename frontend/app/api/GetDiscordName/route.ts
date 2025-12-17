import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { list } from '@vercel/blob';

interface CsvRecord {
  'What is your Discord handle? - Discord Display Name': string;
  'At which Ethereum address would you like to receive the NFT?': string;
  [key: string]: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ethAddress = searchParams.get('address');
    const authHeader = request.headers.get('Authorization');

    // Check API key from Authorization header
    const expectedKey = `Bearer ${process.env.DISCORD_API_KEY}`;
    if (authHeader !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!ethAddress) {
      return NextResponse.json(
        { error: 'Ethereum address parameter is required' },
        { status: 400 }
      );
    }

    let csvContent = '';

    // Try to fetch the latest CSV from Vercel Blob
    try {
      const blobs = await list();
      const latestFile = blobs.blobs.find(blob => blob.pathname === 'discord_data_latest.csv');
      
      if (latestFile) {
        const response = await fetch(latestFile.url);
        csvContent = await response.text();
      }
    } catch (blobError) {
      console.log('Blob fetch failed, falling back to static CSV');
    }

    // Fall back to static CSV if Blob fetch failed
    if (!csvContent) {
      const csvPath = path.join(process.cwd(), 'public/data/Alchemy-Community-Call-Nov-26-2025_2025-11-26T19_50_06.csv');
      if (fs.existsSync(csvPath)) {
        csvContent = fs.readFileSync(csvPath, 'utf-8');
      }
    }

    if (!csvContent) {
      return NextResponse.json(
        { error: 'No CSV data available' },
        { status: 500 }
      );
    }
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    }) as CsvRecord[];

    // Search for the address
    const record = records.find((row: CsvRecord) => 
      row['At which Ethereum address would you like to receive the NFT?']?.toLowerCase() === ethAddress.toLowerCase()
    );

    if (!record) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      discordName: record['What is your Discord handle? - Discord Display Name'],
      ethAddress: record['At which Ethereum address would you like to receive the NFT?'],
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
