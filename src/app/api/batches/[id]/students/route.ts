import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const batchStudents = await prisma.batchStudent.findMany({
      where: { batchId: id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(batchStudents.map((bs) => bs.student));
  } catch (error) {
    console.error("Error fetching batch students:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch students" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "TRAINER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { studentIds } = body as { studentIds: string[] };

    // Delete all existing batch students
    await prisma.batchStudent.deleteMany({
      where: { batchId: id },
    });

    // Create new batch students
    if (studentIds && studentIds.length > 0) {
      await prisma.batchStudent.createMany({
        data: studentIds.map((studentId) => ({
          batchId: id,
          studentId,
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating batch students:", error);
    return NextResponse.json(
      { error: "Failed to update batch students" },
      { status: 500 }
    );
  }
}
