import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, readdir, mkdir } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { createWriteStream, createReadStream, existsSync } from "fs";
import archiver from "archiver";

const execAsync = promisify(exec);

// 🧹 Cleans up the 'data' folder but keeps .gitkeep
async function cleanupDataFolder(dataDir: string) {
  try {
    if (!existsSync(dataDir)) return;
    const files = await readdir(dataDir);
    for (const file of files) {
      if (file !== ".gitkeep") {
        await unlink(join(dataDir, file));
      }
    }
  } catch (error) {
    console.error("Error cleaning up data folder:", error);
  }
}

// 🎒 Creates a ZIP backup of the .cache folder
async function createZipBackup(outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(`✅ Backup created: ${archive.pointer()} total bytes`);
      resolve(outputPath);
    });

    archive.on("error", (err) => {
      reject(new Error(`Zip creation failed: ${err.message}`));
    });

    archive.pipe(output);

    // Ensure .cache directory exists before zipping
    const cacheDir = join(process.cwd(), ".cache");
    if (!existsSync(cacheDir)) {
      console.warn("⚠️ .cache folder is missing, creating it...");
      mkdir(cacheDir, { recursive: true });
    }

    archive.directory(cacheDir, false); // ✅ Zips all contents inside .cache
    archive.finalize();
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    // 🗂 Ensure data and .cache directories exist
    const dataDir = join(process.cwd(), "data");
    const cacheDir = join(process.cwd(), ".cache");
    if (!existsSync(dataDir)) await mkdir(dataDir, { recursive: true });
    if (!existsSync(cacheDir)) await mkdir(cacheDir, { recursive: true });

    // 💾 Save all uploaded files
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

    // ⚙️ Run the generate command
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

    // 🗜 Create backup zip
    let backupUrl = null;
    try {
      const backupPath = join(process.cwd(), "public", "backup.zip");
      await createZipBackup(backupPath);
      backupUrl = "/backup.zip";
    } catch (error) {
      console.error("Error creating backup:", error);
    }

    // 🧹 Cleanup data folder after processing
    await cleanupDataFolder(dataDir);

    return NextResponse.json({
      message: "Documents processed successfully",
      backupUrl,
      success: true,
    });
  } catch (error) {
    console.error("Error processing documents:", error);
    await cleanupDataFolder(join(process.cwd(), "data"));

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      },
      { status: 500 }
    );
  }
}

// 📥 Serves the backup zip file
export async function GET(req: NextRequest) {
  const backupPath = join(process.cwd(), "public", "backup.zip");

  try {
    if (!existsSync(backupPath)) {
      throw new Error("Backup file does not exist.");
    }

    const stream = createReadStream(backupPath);
    const response = new Response(stream as unknown as ReadableStream);

    response.headers.set("Content-Type", "application/zip");
    response.headers.set("Content-Disposition", "attachment; filename=backup.zip");

    return response;
  } catch (error) {
    console.error("Error streaming backup file:", error);
    return NextResponse.json(
      { error: "Backup file not found or could not be read" },
      { status: 404 }
    );
  }
}
