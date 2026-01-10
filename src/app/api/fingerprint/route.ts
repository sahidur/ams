import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { checkPermission } from "@/lib/permissions";
import crypto from "crypto";

// Generate registration options for WebAuthn
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    // Check permission
    const canWrite = await checkPermission(session.user.id, "CLASSES", "WRITE");
    if (!canWrite && !["ADMIN", "TRAINER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get student info
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Generate challenge
    const challenge = crypto.randomBytes(32).toString("base64url");

    // Store challenge temporarily (in practice, use a session store)
    // For now, we'll include it in the response and verify on the client

    const registrationOptions = {
      challenge,
      rp: {
        name: "AMS - Attendance Management System",
        id: process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : "localhost",
      },
      user: {
        id: Buffer.from(student.id).toString("base64url"),
        name: student.email,
        displayName: student.name,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },  // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      timeout: 60000,
      attestation: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Use platform authenticator (fingerprint, face ID)
        userVerification: "required",
        residentKey: "preferred",
      },
    };

    return NextResponse.json({ options: registrationOptions, studentId });
  } catch (error) {
    console.error("Error generating registration options:", error);
    return NextResponse.json(
      { error: "Failed to generate registration options" },
      { status: 500 }
    );
  }
}

// Register fingerprint credential
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, credential } = body;

    if (!studentId || !credential) {
      return NextResponse.json(
        { error: "Student ID and credential are required" },
        { status: 400 }
      );
    }

    // Check permission
    const canWrite = await checkPermission(session.user.id, "CLASSES", "WRITE");
    if (!canWrite && !["ADMIN", "TRAINER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify student exists
    const student = await prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check if credential already exists
    const existingCredential = await prisma.fingerprintCredential.findUnique({
      where: { credentialId: credential.id },
    });

    if (existingCredential) {
      return NextResponse.json(
        { error: "This fingerprint is already registered" },
        { status: 400 }
      );
    }

    // Store credential
    const fingerprintCredential = await prisma.fingerprintCredential.create({
      data: {
        userId: studentId,
        credentialId: credential.id,
        publicKey: credential.publicKey,
        counter: 0,
        transports: credential.transports || [],
        deviceType: credential.authenticatorAttachment || "platform",
        backedUp: credential.clientExtensionResults?.credProps?.rk || false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Fingerprint registered successfully",
      credentialId: fingerprintCredential.id,
    });
  } catch (error) {
    console.error("Error registering fingerprint:", error);
    return NextResponse.json(
      { error: "Failed to register fingerprint" },
      { status: 500 }
    );
  }
}

// Delete fingerprint credential
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get("credentialId");
    const studentId = searchParams.get("studentId");

    if (!credentialId && !studentId) {
      return NextResponse.json(
        { error: "Credential ID or Student ID required" },
        { status: 400 }
      );
    }

    // Check permission
    const canDelete = await checkPermission(session.user.id, "CLASSES", "DELETE");
    if (!canDelete && !["ADMIN", "TRAINER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (credentialId) {
      await prisma.fingerprintCredential.delete({
        where: { id: credentialId },
      });
    } else if (studentId) {
      // Delete all fingerprints for this student
      await prisma.fingerprintCredential.deleteMany({
        where: { userId: studentId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting fingerprint:", error);
    return NextResponse.json(
      { error: "Failed to delete fingerprint" },
      { status: 500 }
    );
  }
}
