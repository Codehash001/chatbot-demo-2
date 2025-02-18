import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, readdir, mkdir } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { createWriteStream, createReadStream } from "fs";
import archiver from "archiver";
import { spawn } from "child_process";
import os from "os";

const execAsync = promisify(exec);

async function cleanupDataFolder(dataDir: string) {
  try {
    const files = await readdir(dataDir);
    for (const file of files) {
      if (file !== '.gitkeep') {
        await unlink(join(dataDir, file));
      }
    }
  } catch (error) {
    console.error('Error cleaning up data folder:', error);
  }
}

async function createZipBackup(sourceDir: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(`Backup created: ${archive.pointer()} total bytes`);
      resolve(outputPath);
    });

    archive.on("error", (err) => {
      reject(new Error(`Zip creation failed: ${err.message}`));
    });

    archive.pipe(output);
    archive.directory(sourceDir, false); // Add the entire directory to the zip
    archive.finalize();
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    // Create data directory if it doesn't exist
    const dataDir = join(process.cwd(), "data");
    const cacheDir = join(process.cwd(), ".cache");
    
    try {
      await writeFile(join(dataDir, ".gitkeep"), "");
    } catch (error) {
      console.error("Error creating data directory:", error);
      throw new Error("Failed to create data directory");
    }

    // Save all files
    try {
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(join(dataDir, file.name), buffer);
      }
    } catch (error) {
      console.error("Error saving files:", error);
      throw new Error("Failed to save uploaded files");
    }

    // Run the generate command
    try {
      const { stdout, stderr } = await execAsync("npm run generate", {
        cwd: process.cwd(),
      });

      console.log("Generate command output:", stdout);
      if (stderr) console.error("Generate command stderr:", stderr);

      if (stderr && !stderr.includes("npm notice") && stderr.toLowerCase().includes("error")) {
        throw new Error(`Generate command failed: ${stderr}`);
      }
    } catch (error) {
      console.error("Error running generate command:", error);
      await cleanupDataFolder(dataDir);
      throw new Error(error instanceof Error ? error.message : "Failed to run generate command");
    }

    // Create backup zip
    let backupUrl = null;
    try {
      const backupPath = join(process.cwd(), "public", "backup.zip");
      await createZipBackup(cacheDir, backupPath);
      backupUrl = "/backup.zip";
    } catch (error) {
      console.error("Error creating backup:", error);
      // Don't throw here, we'll still return success for the ingestion
    }

    // Cleanup data folder
    await cleanupDataFolder(dataDir);

    return NextResponse.json({
      message: "Documents processed successfully",
      backupUrl,
      success: true
    });
  } catch (error) {
    console.error("Error processing documents:", error);
    // Ensure cleanup happens even on error
    const dataDir = join(process.cwd(), "data");
    await cleanupDataFolder(dataDir);

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const backupPath = join(process.cwd(), "public", "backup.zip");
  
  try {
    const stream = createReadStream(backupPath);
    const response = new Response(stream as unknown as ReadableStream);
    
    response.headers.set('Content-Type', 'application/zip');
    response.headers.set('Content-Disposition', 'attachment; filename=backup.zip');
    
    return response;
  } catch (error) {
    console.error("Error streaming backup file:", error);
    return NextResponse.json(
      { error: "Backup file not found or could not be read" },
      { status: 404 }
    );
  }
}
