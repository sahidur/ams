import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logUserChanges } from "@/lib/activity-log";

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, whatsappNumber, dateOfBirth, gender, address } = body;

    // Get current user data for logging
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        phone: true,
        whatsappNumber: true,
        dateOfBirth: true,
        gender: true,
        address: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const oldDataForLogging = {
      name: currentUser.name,
      phone: currentUser.phone,
      whatsappNumber: currentUser.whatsappNumber,
      dateOfBirth: currentUser.dateOfBirth,
      gender: currentUser.gender,
      address: currentUser.address,
    };

    const newDataForLogging = {
      name,
      phone: phone || null,
      whatsappNumber: whatsappNumber || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender,
      address,
    };

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        phone: phone || null,
        whatsappNumber: whatsappNumber || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        address,
      },
    });

    // Log the changes
    await logUserChanges(
      session.user.id,
      session.user.id,
      oldDataForLogging as Record<string, unknown>,
      newDataForLogging as Record<string, unknown>,
      "UPDATE"
    );

    return NextResponse.json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
