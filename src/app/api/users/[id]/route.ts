import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        approvalStatus: true,
        isVerified: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        profileImage: true,
        designation: true,
        department: true,
        joiningDate: true,
        employeeId: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone, role, designation, department, dateOfBirth, gender, address, userRoleId, resetPassword } = body;

    // Check if user is Super Admin for password reset
    let generatedPassword: string | null = null;
    if (resetPassword) {
      // Verify the current user is Super Admin
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { userRole: true },
      });
      
      if (!currentUser?.userRole || currentUser.userRole.name !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Only Super Admin can reset passwords" },
          { status: 403 }
        );
      }
      
      // Generate random 8-character password
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      generatedPassword = '';
      for (let i = 0; i < 8; i++) {
        generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    // Get the role name from userRoleId if provided
    let roleToUse = role;
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
        roleToUse = roleMapping[userRole.name] || role;
      }
    }

    const updateData: Record<string, unknown> = {
      name,
      email,
      phone: phone || null,
      role: roleToUse,
      userRoleId: userRoleId || null,
      designation,
      department,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender,
      address,
    };
    
    // Add hashed password if reset was requested
    if (generatedPassword) {
      updateData.password = await hash(generatedPassword, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      message: generatedPassword ? "User updated and password reset successfully" : "User updated successfully",
      user,
      ...(generatedPassword && { generatedPassword }),
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
