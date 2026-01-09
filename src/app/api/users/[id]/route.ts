import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkPermission } from "@/lib/permissions";

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
        whatsappNumber: true,
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
        isActive: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        profileImage: true,
        designation: true,
        designationId: true,
        designationRef: {
          select: {
            id: true,
            name: true,
          },
        },
        department: true,
        joiningDate: true,
        employeeId: true,
        // New job fields
        joiningDateBrac: true,
        joiningDateCurrentBase: true,
        joiningDateCurrentPosition: true,
        contractEndDate: true,
        employmentStatusId: true,
        employmentStatus: {
          select: {
            id: true,
            name: true,
          },
        },
        employmentTypeId: true,
        employmentType: {
          select: {
            id: true,
            name: true,
          },
        },
        firstSupervisorId: true,
        firstSupervisor: {
          select: {
            id: true,
            name: true,
            email: true,
            firstSupervisorId: true,
            firstSupervisor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        jobGrade: true,
        yearsOfExperience: true,
        salary: true,
        // Performance fields
        slab: true,
        lastSlabChange: true,
        secondLastSlabChange: true,
        lastGradeChange: true,
        secondLastGradeChange: true,
        lastOneOffBonus: true,
        secondLastOneOffBonus: true,
        pmsMarkLastYear: true,
        pmsMarkSecondLastYear: true,
        pmsMarkThirdLastYear: true,
        lastWarningDate: true,
        secondLastWarningDate: true,
        thirdLastWarningDate: true,
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
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check WRITE permission on USERS module
    const canWriteUsers = await checkPermission(session.user.id, "USERS", "WRITE");
    if (!canWriteUsers) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the current user's role to check if they're Super Admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { userRole: true },
    });
    const isSuperAdmin = currentUser?.userRole?.name === "SUPER_ADMIN";

    // Get the target user to check if they're Super Admin
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { userRole: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only Super Admin can edit other Super Admins
    if (targetUser.userRole?.name === "SUPER_ADMIN" && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Only Super Admin can modify Super Admin users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      name, email, phone, role, designation, department, dateOfBirth, gender, address, 
      userRoleId, resetPassword, isActive, whatsappNumber,
      // New job fields
      designationId, joiningDateBrac, joiningDateCurrentBase, joiningDateCurrentPosition,
      contractEndDate, employmentStatusId, employmentTypeId, firstSupervisorId,
      jobGrade, yearsOfExperience, salary,
      // Performance fields
      slab, lastSlabChange, secondLastSlabChange, lastGradeChange, secondLastGradeChange,
      lastOneOffBonus, secondLastOneOffBonus, pmsMarkLastYear, pmsMarkSecondLastYear,
      pmsMarkThirdLastYear, lastWarningDate, secondLastWarningDate, thirdLastWarningDate
    } = body;

    // Check if user is Super Admin for password reset
    let generatedPassword: string | null = null;
    if (resetPassword) {
      if (!isSuperAdmin) {
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
      whatsappNumber: whatsappNumber || null,
      // New job fields
      designationId: designationId || null,
      joiningDateBrac: joiningDateBrac ? new Date(joiningDateBrac) : null,
      joiningDateCurrentBase: joiningDateCurrentBase ? new Date(joiningDateCurrentBase) : null,
      joiningDateCurrentPosition: joiningDateCurrentPosition ? new Date(joiningDateCurrentPosition) : null,
      contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
      employmentStatusId: employmentStatusId || null,
      employmentTypeId: employmentTypeId || null,
      firstSupervisorId: firstSupervisorId || null,
      jobGrade: jobGrade ? parseInt(jobGrade) : null,
      yearsOfExperience: yearsOfExperience ? parseFloat(yearsOfExperience) : null,
      salary: salary ? parseFloat(salary) : null,
      // Performance fields
      slab: slab ? parseInt(slab) : null,
      lastSlabChange: lastSlabChange ? new Date(lastSlabChange) : null,
      secondLastSlabChange: secondLastSlabChange ? new Date(secondLastSlabChange) : null,
      lastGradeChange: lastGradeChange ? new Date(lastGradeChange) : null,
      secondLastGradeChange: secondLastGradeChange ? new Date(secondLastGradeChange) : null,
      lastOneOffBonus: lastOneOffBonus ? new Date(lastOneOffBonus) : null,
      secondLastOneOffBonus: secondLastOneOffBonus ? new Date(secondLastOneOffBonus) : null,
      pmsMarkLastYear: pmsMarkLastYear || null,
      pmsMarkSecondLastYear: pmsMarkSecondLastYear || null,
      pmsMarkThirdLastYear: pmsMarkThirdLastYear || null,
      lastWarningDate: lastWarningDate ? new Date(lastWarningDate) : null,
      secondLastWarningDate: secondLastWarningDate ? new Date(secondLastWarningDate) : null,
      thirdLastWarningDate: thirdLastWarningDate ? new Date(thirdLastWarningDate) : null,
    };

    // Add isActive if provided
    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }
    
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
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check DELETE permission on USERS module
    const canDeleteUsers = await checkPermission(session.user.id, "USERS", "DELETE");
    if (!canDeleteUsers) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the current user's role to check if they're Super Admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { userRole: true },
    });
    const isSuperAdmin = currentUser?.userRole?.name === "SUPER_ADMIN";

    // Get the target user to check if they're Super Admin
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { userRole: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only Super Admin can delete other Super Admins
    if (targetUser.userRole?.name === "SUPER_ADMIN" && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Only Super Admin can delete Super Admin users" },
        { status: 403 }
      );
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
