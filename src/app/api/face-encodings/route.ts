import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check WRITE permission on FACE_TRAINING module
    const canWriteFaceTraining = await checkPermission(session.user.id, "FACE_TRAINING", "WRITE");
    if (!canWriteFaceTraining) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, encoding } = body;

    if (!userId || !encoding || !Array.isArray(encoding)) {
      return NextResponse.json(
        { error: "Invalid data. userId and encoding array required." },
        { status: 400 }
      );
    }

    // Check if user exists and is a student
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete existing face encoding if any
    await prisma.faceEncoding.deleteMany({
      where: { userId },
    });

    // Create new face encoding
    const faceEncoding = await prisma.faceEncoding.create({
      data: {
        userId,
        encoding: encoding,
        label: user.name, // Use user's name as the label
      },
    });

    return NextResponse.json(faceEncoding, { status: 201 });
  } catch (error) {
    console.error("Error saving face encoding:", error);
    return NextResponse.json(
      { error: "Failed to save face encoding" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (userId) {
      // Count face encodings for a user
      const count = await prisma.faceEncoding.count({
        where: { userId },
      });
      return NextResponse.json({ count });
    }

    // Get all face encodings (requires READ permission on FACE_TRAINING)
    const canReadFaceTraining = await checkPermission(session.user.id, "FACE_TRAINING", "READ");
    if (!canReadFaceTraining) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const faceEncodings = await prisma.faceEncoding.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(faceEncodings);
  } catch (error) {
    console.error("Error fetching face encodings:", error);
    return NextResponse.json(
      { error: "Failed to fetch face encodings" },
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

    // Check DELETE permission on FACE_TRAINING module
    const canDeleteFaceTraining = await checkPermission(session.user.id, "FACE_TRAINING", "DELETE");
    if (!canDeleteFaceTraining) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Delete all face encodings for the user
    await prisma.faceEncoding.deleteMany({
      where: { userId },
    });

    return NextResponse.json({ success: true, message: "Face data deleted successfully" });
  } catch (error) {
    console.error("Error deleting face encodings:", error);
    return NextResponse.json(
      { error: "Failed to delete face encodings" },
      { status: 500 }
    );
  }
}
