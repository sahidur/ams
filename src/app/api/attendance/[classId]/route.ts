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
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const date = searchParams.get("date");

    // Build where clause
    const whereClause: {
      classId: string;
      sessionId?: string;
      sessionDate?: { gte: Date; lt: Date };
    } = { classId };
    
    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      whereClause.sessionDate = {
        gte: startDate,
        lt: endDate,
      };
    }

    const attendance = await prisma.attendance.findMany({
      where: whereClause,
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
    const { studentId, isPresent, confidence, markedBy, capturedImageUrl, sessionId } = body;

    // Use provided sessionId or create one for today
    const effectiveSessionId = sessionId || new Date().toISOString().split('T')[0];
    const sessionDate = new Date();
    sessionDate.setHours(0, 0, 0, 0);

    // Check if attendance already exists for this session
    const existing = await prisma.attendance.findFirst({
      where: {
        classId,
        studentId,
        sessionId: effectiveSessionId,
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
          capturedImageUrl: capturedImageUrl || existing.capturedImageUrl,
          verificationMethod: markedBy?.includes("FACE") ? "FACE" : markedBy?.includes("FINGERPRINT") ? "FINGERPRINT" : "MANUAL",
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
          capturedImageUrl: capturedImageUrl || null,
          sessionId: effectiveSessionId,
          sessionDate,
          verificationMethod: markedBy?.includes("FACE") ? "FACE" : markedBy?.includes("FINGERPRINT") ? "FINGERPRINT" : "MANUAL",
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
