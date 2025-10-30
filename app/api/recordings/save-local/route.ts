import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    console.log("📁 Local recording save request received");

    // Parse form data
    const formData = await request.formData();
    const audioFiles = formData.getAll("audio") as File[];
    const meetingId = formData.get("meetingId") as string;

    if (!audioFiles || audioFiles.length === 0 || !meetingId) {
      return NextResponse.json(
        { error: "Missing audio files or meetingId" },
        { status: 400 }
      );
    }

    console.log(
      `💾 Saving ${audioFiles.length} audio files locally for meeting: ${meetingId}`
    );

    // Create directory path: ./public/recordings/{meetingId}/
    const recordingsDir = path.join(
      process.cwd(),
      "public",
      "recordings",
      meetingId
    );

    // Create directory if it doesn't exist
    if (!existsSync(recordingsDir)) {
      await mkdir(recordingsDir, { recursive: true });
      console.log(`📂 Created directory: ${recordingsDir}`);
    }

    const savedFiles: string[] = [];

    // Save each audio file
    for (const audioFile of audioFiles) {
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const filename = audioFile.name || `recording-${Date.now()}.webm`;
      const filePath = path.join(recordingsDir, filename);

      await writeFile(filePath, buffer);

      const publicPath = `/recordings/${meetingId}/${filename}`;
      savedFiles.push(publicPath);

      console.log(
        `✅ Saved: ${filename} (${buffer.length} bytes) -> ${publicPath}`
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${audioFiles.length} audio files`,
      files: savedFiles,
      meetingId,
      directory: `/recordings/${meetingId}/`,
    });
  } catch (error) {
    console.error("❌ Error saving recordings locally:", error);
    return NextResponse.json(
      {
        error: "Failed to save recordings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
