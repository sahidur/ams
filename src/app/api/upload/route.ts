import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  uploadToSpaces,
  deleteFromSpaces,
  getKeyFromUrl,
  isAllowedFileType,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_ATTACHMENT_TYPES,
  MAX_FILE_SIZES,
} from "@/lib/spaces";
import prisma from "@/lib/prisma";

// Route segment config for large file uploads (30 minute timeout)
export const maxDuration = 1800; // 30 minutes in seconds
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string; // "profile-image", "document", etc.
    const entityId = formData.get("entityId") as string | null; // Optional: user ID, project ID, etc.

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: "Upload type is required" }, { status: 400 });
    }

    // Validate file type based on upload type
    let allowedTypes: string[];
    let maxSize: number;
    let folder: string;

    switch (type) {
      case "profile-image":
        allowedTypes = ALLOWED_IMAGE_TYPES;
        maxSize = MAX_FILE_SIZES.image;
        folder = "profile-images";
        break;
      case "document":
        allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
        maxSize = MAX_FILE_SIZES.document;
        folder = "documents";
        break;
      case "comment-attachment":
        allowedTypes = ALLOWED_ATTACHMENT_TYPES;
        maxSize = MAX_FILE_SIZES.attachment;
        folder = "comment-attachments";
        break;
      default:
        return NextResponse.json({ error: "Invalid upload type" }, { status: 400 });
    }

    // Validate file type
    if (!isAllowedFileType(file.type, allowedTypes)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed types: ${allowedTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to DigitalOcean Spaces
    const result = await uploadToSpaces(buffer, file.name, folder, file.type);

    // If this is a profile image, update the user's profile and delete old image
    if (type === "profile-image") {
      const userId = entityId || session.user.id;
      
      // Get current profile image to delete
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { profileImage: true },
      });

      // Delete old profile image if exists
      if (currentUser?.profileImage) {
        const oldKey = getKeyFromUrl(currentUser.profileImage);
        if (oldKey) {
          try {
            await deleteFromSpaces(oldKey);
          } catch (error) {
            console.error("Error deleting old profile image:", error);
          }
        }
      }

      // Update user with new profile image URL
      await prisma.user.update({
        where: { id: userId },
        data: { profileImage: result.url },
      });
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    const type = searchParams.get("type");

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const key = getKeyFromUrl(url);
    if (!key) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Delete from Spaces
    await deleteFromSpaces(key);

    // If profile image, clear it from user
    if (type === "profile-image") {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { profileImage: null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
