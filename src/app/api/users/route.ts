// @ts-nocheck
// TODO: Remove @ts-nocheck after running prisma db push and prisma generate
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const minimal = searchParams.get("minimal") === "true";
    const search = searchParams.get("search") || "";

    // Minimal mode for dropdown - accessible by ADMIN and HO_USER
    if (minimal) {
      if (!["ADMIN", "HO_USER"].includes(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const users = await prisma.user.findMany({
        where: {
          approvalStatus: "APPROVED",
          ...(search && {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          designation: true,
        },
        orderBy: { name: "asc" },
        take: 50,
      });

      return NextResponse.json(users);
    }

    // Full user list - only for ADMIN
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        userRoleId: true,
        userRole: {
          select: {
            id: true,
            name: true,
            displayName: true,
            isActive: true,
          },
        },
        approvalStatus: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone, role, designation, department, userRoleId } = body;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email or phone already exists" },
        { status: 400 }
      );
    }

    // Get the role name from userRoleId if provided
    let roleToUse = role || "BASIC_USER";
    if (userRoleId) {
      const userRole = await prisma.userRole.findUnique({
        where: { id: userRoleId },
      });
      if (userRole) {
        // Map new role names to old enum values for backwards compatibility
        const roleMapping: Record<string, string> = {
          "SUPER_ADMIN": "ADMIN",
          "ADMIN": "ADMIN",
          "HO_USER": "HO_USER",
          "TRAINER": "TRAINER",
          "STUDENT": "STUDENT",
          "BASIC_USER": "BASIC_USER",
        };
        roleToUse = roleMapping[userRole.name] || "BASIC_USER";
      }
    }

    // Generate default password and PIN for admin-created users
    const defaultPassword = "password123";
    const defaultPin = "1234";
    const hashedPassword = await hash(defaultPassword, 12);
    const hashedPin = await hash(defaultPin, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        role: roleToUse,
        userRoleId: userRoleId || null,
        designation,
        department,
        password: hashedPassword,
        pin: hashedPin,
        approvalStatus: "APPROVED", // Auto-approved when created by admin
        isVerified: true,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({
      message: "User created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
