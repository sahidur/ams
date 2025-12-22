import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { classId } = await params;

    const attendance = await prisma.attendance.findMany({
      where: { classId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { classId } = await params;
    const body = await request.json();
    const { studentId, isPresent, confidence, markedBy } = body;

    // Check if attendance already exists
    const existing = await prisma.attendance.findFirst({
      where: {
        classId,
        studentId,
      },
    });

    let attendance;

    if (existing) {
      attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          isPresent,
          confidence: confidence || null,
          markedBy: markedBy || "MANUAL",
        },
      });
    } else {
      attendance = await prisma.attendance.create({
        data: {
          classId,
          studentId,
          isPresent,
          confidence: confidence || null,
          markedBy: markedBy || "MANUAL",
        },
      });
    }

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Error saving attendance:", error);
    return NextResponse.json(
      { error: "Failed to save attendance" },
      { status: 500 }
    );
  }
}
