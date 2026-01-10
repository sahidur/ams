import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// GET: Get registration options
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate challenge
    const challenge = crypto.randomBytes(32).toString("base64url");

    const options = {
      challenge,
      rp: {
        name: "Somadhanhobe - Programme Management System",
        id: process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : "localhost",
      },
      user: {
        id: Buffer.from(user.id).toString("base64url"),
        name: user.email,
        displayName: user.name,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },  // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      timeout: 60000,
      attestation: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
    };

    return NextResponse.json({ options });
  } catch (error) {
    console.error("Error generating registration options:", error);
    return NextResponse.json(
      { error: "Failed to generate registration options" },
      { status: 500 }
    );
  }
}

// POST: Register passkey
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { credentialId, publicKey, attestationObject, clientDataJSON } = body;

    if (!credentialId || !publicKey) {
      return NextResponse.json(
        { error: "Missing credential data" },
        { status: 400 }
      );
    }

    // Check if user already has a passkey
    const existing = await prisma.userPasskey.findFirst({
      where: { userId: session.user.id },
    });

    if (existing) {
      // Update existing passkey
      await prisma.userPasskey.update({
        where: { id: existing.id },
        data: {
          credentialId,
          publicKey,
          counter: 0,
          consentGiven: true,
          consentDate: new Date(),
        },
      });
    } else {
      // Create new passkey
      await prisma.userPasskey.create({
        data: {
          userId: session.user.id,
          credentialId,
          publicKey,
          counter: 0,
          consentGiven: true,
          consentDate: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error registering passkey:", error);
    return NextResponse.json(
      { error: "Failed to register passkey" },
      { status: 500 }
    );
  }
}
