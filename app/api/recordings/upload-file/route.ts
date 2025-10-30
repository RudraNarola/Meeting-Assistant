import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";

// Firebase configuration
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  apiKey: process.env.FIREBASE_API_KEY,
};

// Initialize Firebase
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const uploadedAt = formData.get("uploadedAt") as string;

    if (!file || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `${title.replace(
      /[^a-z0-9]/gi,
      "_"
    )}-${timestamp}.${fileExtension}`;

    // Create uploads directory structure
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file
    const filePath = path.join(uploadsDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create public URL
    const publicUrl = `/uploads/${fileName}`;

    // Save metadata to Firestore
    const recordingDoc = await addDoc(collection(db, "uploaded_recordings"), {
      title,
      fileName,
      filePath,
      publicUrl,
      fileSize: file.size,
      fileType: file.type,
      uploadedBy: session.user.email,
      uploadedAt: uploadedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    console.log("File uploaded successfully:", {
      fileName,
      publicUrl,
      docId: recordingDoc.id,
    });

    return NextResponse.json({
      success: true,
      fileName,
      publicUrl,
      id: recordingDoc.id,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
