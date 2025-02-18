import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const cacheDir = path.join(process.cwd(), '.cache');
    const exists = fs.existsSync(cacheDir);
    
    let lastModified = null;
    if (exists) {
      const stats = fs.statSync(cacheDir);
      lastModified = stats.mtime.toLocaleString();
    }

    return NextResponse.json({
      exists,
      lastModified
    });
  } catch (error) {
    console.error('Error checking cache folder:', error);
    return NextResponse.json(
      { error: 'Failed to check cache folder' },
      { status: 500 }
    );
  }
}
