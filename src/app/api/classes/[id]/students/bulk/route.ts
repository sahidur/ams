import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { checkPermission } from "@/lib/permissions";

interface BulkStudentData {
  name: string;
  email: string;
  phone?: string;
}

// POST - Bulk upload students to a class
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
    const { students } = body as { students: BulkStudentData[] };

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: "Students array is required" },
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

    const results = {
      created: 0,
      existing: 0,
      enrolled: 0,
      errors: [] as { row: number; name: string; error: string }[],
    };

    for (let i = 0; i < students.length; i++) {
      const studentData = students[i];
      const rowNum = i + 1;

      if (!studentData.name || !studentData.email) {
        results.errors.push({
          row: rowNum,
          name: studentData.name || "Unknown",
          error: "Name and email are required",
        });
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(studentData.email)) {
        results.errors.push({
          row: rowNum,
          name: studentData.name,
          error: "Invalid email format",
        });
        continue;
      }

      try {
        // Check if user with this email already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: studentData.email },
        });

        let student;

        if (existingUser) {
          // If user exists and is already a student, use them
          if (existingUser.role !== "STUDENT") {
            results.errors.push({
              row: rowNum,
              name: studentData.name,
              error: "User exists with non-student role",
            });
            continue;
          }
          student = existingUser;
          results.existing++;
        } else {
          // Create new student
          const defaultPassword = Math.random().toString(36).slice(-8);
          const defaultPin = Math.floor(1000 + Math.random() * 9000).toString();
          
          const hashedPassword = await hash(defaultPassword, 12);
          const hashedPin = await hash(defaultPin, 12);

          student = await prisma.user.create({
            data: {
              name: studentData.name,
              email: studentData.email,
              phone: studentData.phone || null,
              password: hashedPassword,
              pin: hashedPin,
              role: "STUDENT",
              approvalStatus: "APPROVED",
              isVerified: true,
              isActive: true,
              createdBy: session.user.id,
            },
          });
          results.created++;
        }

        // Check if already enrolled in this class
        const existingEnrollment = await prisma.classStudent.findUnique({
          where: {
            classId_studentId: { classId, studentId: student.id },
          },
        });

        if (!existingEnrollment) {
          // Add student to class
          await prisma.classStudent.create({
            data: {
              classId,
              studentId: student.id,
            },
          });
          results.enrolled++;
        }
      } catch (error) {
        console.error(`Error processing student ${studentData.email}:`, error);
        results.errors.push({
          row: rowNum,
          name: studentData.name,
          error: "Database error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Created ${results.created} new students, found ${results.existing} existing, enrolled ${results.enrolled} to class${results.errors.length > 0 ? `, ${results.errors.length} errors` : ""}`,
    });
  } catch (error) {
    console.error("Error bulk uploading students:", error);
    return NextResponse.json(
      { error: "Failed to bulk upload students" },
      { status: 500 }
    );
  }
}
