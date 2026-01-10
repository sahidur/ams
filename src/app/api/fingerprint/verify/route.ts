import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// Generate authentication options
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json({ error: "Class ID required" }, { status: 400 });
    }

    // Get all students in the class with fingerprint credentials
    const classStudents = await prisma.classStudent.findMany({
      where: { classId },
      include: {
        student: {
          include: {
            fingerprintCredentials: {
              select: {
                credentialId: true,
                transports: true,
              },
            },
          },
        },
      },
    });

    // Collect all allowed credentials
    const allowCredentials = classStudents.flatMap(cs => 
      cs.student.fingerprintCredentials.map(cred => ({
        id: cred.credentialId,
        type: "public-key" as const,
        transports: cred.transports as AuthenticatorTransport[],
      }))
    );

    if (allowCredentials.length === 0) {
      return NextResponse.json(
        { error: "No students with fingerprint credentials found in this class" },
        { status: 404 }
      );
    }

    // Generate challenge
    const challenge = crypto.randomBytes(32).toString("base64url");

    const authenticationOptions = {
      challenge,
      timeout: 60000,
      rpId: process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : "localhost",
      allowCredentials,
      userVerification: "required",
    };

    return NextResponse.json({ options: authenticationOptions });
  } catch (error) {
    console.error("Error generating authentication options:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication options" },
      { status: 500 }
    );
  }
}

// Verify fingerprint and record attendance
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { classId, credential } = body;

    if (!classId || !credential) {
      return NextResponse.json(
        { error: "Class ID and credential are required" },
        { status: 400 }
      );
    }

    // Find the credential
    const fingerprintCredential = await prisma.fingerprintCredential.findUnique({
      where: { credentialId: credential.id },
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

    if (!fingerprintCredential) {
      return NextResponse.json(
        { error: "Fingerprint not recognized" },
        { status: 404 }
      );
    }

    // Verify the student is in this class
    const classStudent = await prisma.classStudent.findUnique({
      where: {
        classId_studentId: {
          classId,
          studentId: fingerprintCredential.userId,
        },
      },
    });

    if (!classStudent) {
      return NextResponse.json(
        { error: "Student not enrolled in this class" },
        { status: 400 }
      );
    }

    // Update credential counter
    await prisma.fingerprintCredential.update({
      where: { id: fingerprintCredential.id },
      data: { counter: { increment: 1 } },
    });

    // Check if attendance already recorded today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        classId,
        studentId: fingerprintCredential.userId,
        markedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json({
        success: true,
        message: "Attendance already recorded for today",
        student: fingerprintCredential.user,
        alreadyRecorded: true,
      });
    }

    // Record attendance
    const attendance = await prisma.attendance.create({
      data: {
        classId,
        studentId: fingerprintCredential.userId,
        isPresent: true,
        markedBy: "FINGERPRINT",
        verificationMethod: "FINGERPRINT",
        markedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance recorded successfully",
      student: fingerprintCredential.user,
      attendance: {
        id: attendance.id,
        isPresent: attendance.isPresent,
        markedAt: attendance.markedAt,
      },
    });
  } catch (error) {
    console.error("Error verifying fingerprint:", error);
    return NextResponse.json(
      { error: "Failed to verify fingerprint" },
      { status: 500 }
    );
  }
}
