import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only trainers and admins can access this
    if (!["ADMIN", "TRAINER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");

    // If specific IDs are provided, just return their face encoding status
    if (idsParam) {
      const requestedIds = idsParam.split(",").filter(id => id.trim());
      
      const faceEncodings = await prisma.faceEncoding.findMany({
        where: {
          userId: { in: requestedIds },
        },
        select: {
          id: true,
          userId: true,
        },
      });
      
      return NextResponse.json(faceEncodings);
    }

    let studentIds: string[] = [];

    if (session.user.role === "TRAINER") {
      // Get students from trainer's batches
      const batches = await prisma.batch.findMany({
        where: { trainerId: session.user.id },
        include: {
          students: {
            select: {
              studentId: true,
            },
          },
        },
      });

      studentIds = batches.flatMap((b) => b.students.map((s) => s.studentId));
    } else {
      // Admin can see all students
      const allStudents = await prisma.user.findMany({
        where: { role: "STUDENT" },
        select: { id: true },
      });
      studentIds = allStudents.map((s) => s.id);
    }

    const students = await prisma.user.findMany({
      where: {
        id: { in: studentIds },
        role: "STUDENT",
      },
      select: {
        id: true,
        name: true,
        email: true,
        faceEncodings: {
          select: { id: true },
          take: 1,
        },
      },
    });

    const result = students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      hasFaceEncoding: s.faceEncodings.length > 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}
