import { NextResponse } from 'next/server';
import { writeFile, rm, mkdir } from 'fs/promises';
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
      // Load the zip file
      const zip = new AdmZip(tempPath);
      const zipEntries = zip.getEntries();

      // Check if the zip contains JSON files
      const jsonFiles = zipEntries.filter(entry => entry.entryName.endsWith('.json'));

      if (jsonFiles.length === 0) {
        throw new Error('Invalid backup: No JSON files found in the zip file');
      }

      // Ensure .cache folder exists
      const cacheDir = path.join(process.cwd(), '.cache');
      if (!existsSync(cacheDir)) {
        await mkdir(cacheDir, { recursive: true });
      }

      // Extract JSON files into .cache folder
      for (const entry of jsonFiles) {
        const outputPath = path.join(cacheDir, entry.entryName);
        await writeFile(outputPath, entry.getData());
      }

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
