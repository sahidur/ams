import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// GET: Get authentication options (for login page)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    let allowCredentials: { id: string; type: string }[] = [];

    if (email) {
      // Get passkeys for specific user
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          passkeys: {
            select: { credentialId: true },
          },
        },
      });

      if (user?.passkeys) {
        allowCredentials = user.passkeys.map((pk) => ({
          id: pk.credentialId,
          type: "public-key",
        }));
      }
    } else {
      // Get all passkeys (for discoverable credentials)
      const passkeys = await prisma.userPasskey.findMany({
        select: { credentialId: true },
      });
      
      allowCredentials = passkeys.map((pk) => ({
        id: pk.credentialId,
        type: "public-key",
      }));
    }

    // Generate challenge
    const challenge = crypto.randomBytes(32).toString("base64url");

    const options = {
      challenge,
      rpId: process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : "localhost",
      allowCredentials,
      userVerification: "required",
      timeout: 60000,
    };

    return NextResponse.json({ options });
  } catch (error) {
    console.error("Error generating auth options:", error);
    return NextResponse.json(
      { error: "Failed to generate auth options" },
      { status: 500 }
    );
  }
}

// POST: Verify passkey and return user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credentialId, authenticatorData, clientDataJSON, signature } = body;

    if (!credentialId) {
      return NextResponse.json(
        { error: "Missing credential ID" },
        { status: 400 }
      );
    }

    // Find passkey by credential ID
    const passkey = await prisma.userPasskey.findUnique({
      where: { credentialId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            userRoleId: true,
            approvalStatus: true,
            isActive: true,
            profileImage: true,
            userRole: {
              select: {
                name: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!passkey) {
      return NextResponse.json(
        { error: "Passkey not found" },
        { status: 404 }
      );
    }

    // Check if user is approved and active
    if (passkey.user.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Your account is pending approval" },
        { status: 403 }
      );
    }

    if (!passkey.user.isActive) {
      return NextResponse.json(
        { error: "Your account has been deactivated" },
        { status: 403 }
      );
    }

    // Update counter
    await prisma.userPasskey.update({
      where: { id: passkey.id },
      data: { counter: passkey.counter + 1 },
    });

    // Return user data for session
    return NextResponse.json({
      success: true,
      user: passkey.user,
    });
  } catch (error) {
    console.error("Error verifying passkey:", error);
    return NextResponse.json(
      { error: "Failed to verify passkey" },
      { status: 500 }
    );
  }
}
