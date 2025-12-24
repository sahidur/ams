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

    // Get the class with students enrolled in the class (not batch)
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          include: {
            student: {
              include: {
                faceEncodings: true,
              },
            },
          },
        },
      },
    });

    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Extract face encodings for all students in the class
    const knownFaces = classData.students
      .filter((s) => s.student.faceEncodings.length > 0)
      .map((s) => ({
        id: s.student.id,
        name: s.student.name,
        embedding: s.student.faceEncodings[0].encoding as number[],
      }));

    return NextResponse.json(knownFaces);
  } catch (error) {
    console.error("Error fetching faces:", error);
    return NextResponse.json(
      { error: "Failed to fetch faces" },
      { status: 500 }
    );
  }
}
