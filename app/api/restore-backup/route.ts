import { NextResponse } from 'next/server';
import { writeFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('backup') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No backup file provided' },
        { status: 400 }
      );
    }

    // Save the uploaded file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = path.join(process.cwd(), 'temp-backup.zip');
    await writeFile(tempPath, buffer);

    try {
      // Verify the zip contains .cache folder
      const zip = new AdmZip(tempPath);
      const zipEntries = zip.getEntries();
      const hasCacheFolder = zipEntries.some(entry => 
        entry.entryName.startsWith('.cache/') || entry.entryName === '.cache'
      );

      if (!hasCacheFolder) {
        throw new Error('Invalid backup: No .cache folder found in the zip file');
      }

      // Remove existing .cache folder if it exists
      const cacheDir = path.join(process.cwd(), '.cache');
      if (existsSync(cacheDir)) {
        await rm(cacheDir, { recursive: true });
      }

      // Extract the backup
      zip.extractAllTo(process.cwd(), true);

      return NextResponse.json({ success: true });
    } finally {
      // Clean up the temporary file
      if (existsSync(tempPath)) {
        await rm(tempPath);
      }
    }
  } catch (error) {
    console.error('Error restoring backup:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to restore backup' },
      { status: 500 }
    );
  }
}
