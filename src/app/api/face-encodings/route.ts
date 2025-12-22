import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only trainers and admins can add face encodings
    if (!["ADMIN", "TRAINER"].includes(session.user.role)) {
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
      const faceEncoding = await prisma.faceEncoding.findFirst({
        where: { userId },
      });
      return NextResponse.json(faceEncoding);
    }

    // Get all face encodings (admin only)
    if (session.user.role !== "ADMIN") {
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
