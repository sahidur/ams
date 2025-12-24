import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET students in a class
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: classId } = await params;

    const classStudents = await prisma.classStudent.findMany({
      where: { classId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { student: { name: "asc" } },
    });

    // Return just the student data
    const students = classStudents.map((cs) => cs.student);
    return NextResponse.json(students);
  } catch (error) {
    console.error("Error fetching class students:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}

// PUT - Update students in a class
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and trainers can update class students
    if (!["ADMIN", "TRAINER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: classId } = await params;
    const body = await request.json();
    const { studentIds } = body;

    if (!Array.isArray(studentIds)) {
      return NextResponse.json(
        { error: "studentIds must be an array" },
        { status: 400 }
      );
    }

    // Delete existing enrollments
    await prisma.classStudent.deleteMany({
      where: { classId },
    });

    // Create new enrollments
    if (studentIds.length > 0) {
      await prisma.classStudent.createMany({
        data: studentIds.map((studentId: string) => ({
          classId,
          studentId,
        })),
      });
    }

    // Return updated student list
    const classStudents = await prisma.classStudent.findMany({
      where: { classId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    const students = classStudents.map((cs) => cs.student);
    return NextResponse.json(students);
  } catch (error) {
    console.error("Error updating class students:", error);
    return NextResponse.json(
      { error: "Failed to update students" },
      { status: 500 }
    );
  }
}

// POST - Add a single student to a class
export async function POST(
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

    const { id: classId } = await params;
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId is required" },
        { status: 400 }
      );
    }

    // Check if already enrolled
    const existing = await prisma.classStudent.findUnique({
      where: {
        classId_studentId: { classId, studentId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Student already enrolled in this class" },
        { status: 400 }
      );
    }

    const enrollment = await prisma.classStudent.create({
      data: { classId, studentId },
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

    return NextResponse.json(enrollment.student, { status: 201 });
  } catch (error) {
    console.error("Error adding student to class:", error);
    return NextResponse.json(
      { error: "Failed to add student" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a student from a class
export async function DELETE(
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

    const { id: classId } = await params;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId query param is required" },
        { status: 400 }
      );
    }

    await prisma.classStudent.delete({
      where: {
        classId_studentId: { classId, studentId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing student from class:", error);
    return NextResponse.json(
      { error: "Failed to remove student" },
      { status: 500 }
    );
  }
}
