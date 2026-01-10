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

    // Get distinct sessions for this class
    const attendanceRecords = await prisma.attendance.findMany({
      where: { classId },
      select: {
        sessionId: true,
        sessionDate: true,
        createdAt: true,
      },
      orderBy: { sessionDate: "desc" },
    });

    // Group by sessionId to get unique sessions
    const sessionsMap = new Map<string, { sessionId: string; sessionDate: Date; count: number }>();
    
    for (const record of attendanceRecords) {
      const sessionId = record.sessionId || record.createdAt.toISOString().split('T')[0];
      if (!sessionsMap.has(sessionId)) {
        sessionsMap.set(sessionId, {
          sessionId,
          sessionDate: record.sessionDate || record.createdAt,
          count: 1,
        });
      } else {
        const existing = sessionsMap.get(sessionId)!;
        existing.count++;
      }
    }

    // Get attendance counts for each session
    const sessions = [];
    for (const [sessionId, data] of sessionsMap) {
      const presentCount = await prisma.attendance.count({
        where: {
          classId,
          sessionId,
          isPresent: true,
        },
      });

      const totalCount = await prisma.attendance.count({
        where: {
          classId,
          sessionId,
        },
      });

      sessions.push({
        sessionId,
        sessionDate: data.sessionDate,
        presentCount,
        totalCount,
        attendancePercentage: totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0,
      });
    }

    // Sort by date descending
    sessions.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching attendance sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance sessions" },
      { status: 500 }
    );
  }
}

// Create a new attendance session
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
    
    // Generate a unique session ID with timestamp
    const now = new Date();
    const sessionId = `${now.toISOString().split('T')[0]}_${now.getTime()}`;

    return NextResponse.json({
      sessionId,
      sessionDate: now,
      classId,
    });
  } catch (error) {
    console.error("Error creating attendance session:", error);
    return NextResponse.json(
      { error: "Failed to create attendance session" },
      { status: 500 }
    );
  }
}
