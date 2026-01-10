import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { checkPermission } from "@/lib/permissions";

// POST - Create a new student and add to class
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission - CLASSES WRITE or BATCHES WRITE
    const canWriteClasses = await checkPermission(session.user.id, "CLASSES", "WRITE");
    const canWriteBatches = await checkPermission(session.user.id, "BATCHES", "WRITE");
    
    if (!canWriteClasses && !canWriteBatches) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: classId } = await params;
    const body = await request.json();
    const { name, email, phone } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Check if class exists
    const classExists = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classExists) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      );
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    let student;

    if (existingUser) {
      // If user exists and is already a student, add to class
      if (existingUser.role !== "STUDENT") {
        return NextResponse.json(
          { error: "A user with this email already exists and is not a student" },
          { status: 400 }
        );
      }
      student = existingUser;
    } else {
      // Create new student
      // Generate a random password and PIN
      const defaultPassword = Math.random().toString(36).slice(-8);
      const defaultPin = Math.floor(1000 + Math.random() * 9000).toString();
      
      const hashedPassword = await hash(defaultPassword, 12);
      const hashedPin = await hash(defaultPin, 12);

      student = await prisma.user.create({
        data: {
          name,
          email,
          phone: phone || null,
          password: hashedPassword,
          pin: hashedPin,
          role: "STUDENT",
          approvalStatus: "APPROVED",
          isVerified: true,
          isActive: true,
          createdBy: session.user.id,
        },
      });
    }

    // Check if already enrolled in this class
    const existingEnrollment = await prisma.classStudent.findUnique({
      where: {
        classId_studentId: { classId, studentId: student.id },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { error: "Student already enrolled in this class" },
        { status: 400 }
      );
    }

    // Add student to class
    await prisma.classStudent.create({
      data: {
        classId,
        studentId: student.id,
      },
    });

    return NextResponse.json({
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      isNew: !existingUser,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating student:", error);
    return NextResponse.json(
      { error: "Failed to create student" },
      { status: 500 }
    );
  }
}
