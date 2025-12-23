// @ts-nocheck
// TODO: Remove @ts-nocheck after running prisma db push and prisma generate
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Type definitions for role management
type SystemModule = "DASHBOARD" | "USERS" | "ROLES" | "PROJECTS" | "BRANCHES" | "BATCHES" | "CLASSES" | "ATTENDANCE" | "FACE_TRAINING" | "PROFILE";
type PermissionAction = "READ" | "WRITE" | "DELETE" | "ALL";

interface RolePermissionInput {
  module: string;
  actions: string[];
}

// GET single role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const role = await prisma.userRole.findUnique({
      where: { id },
      include: {
        permissions: true,
        _count: {
          select: { users: true }
        }
      }
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      { error: "Failed to fetch role" },
      { status: 500 }
    );
  }
}

// PUT update role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if user has permission to manage roles
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRole: {
          include: { permissions: true }
        }
      }
    });

    const hasRolePermission = currentUser?.userRole?.permissions.some(
      p => p.module === "ROLES" && (p.actions.includes("ALL") || p.actions.includes("WRITE"))
    ) || currentUser?.role === "ADMIN";

    if (!hasRolePermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const { displayName, description, isActive, permissions } = body;

    // Get existing role
    const existingRole = await prisma.userRole.findUnique({
      where: { id },
      include: { permissions: true }
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Prevent modifying system roles' core properties
    if (existingRole.isSystem && isActive === false) {
      return NextResponse.json(
        { error: "Cannot deactivate system roles" },
        { status: 400 }
      );
    }

    // Update role
    const role = await prisma.userRole.update({
      where: { id },
      data: {
        displayName: displayName || existingRole.displayName,
        description,
        isActive: isActive ?? existingRole.isActive,
      }
    });

    // Update permissions if provided
    if (permissions && Array.isArray(permissions)) {
      // Delete existing permissions (except for system roles - only modify non-system modules)
      await prisma.rolePermission.deleteMany({
        where: { roleId: id }
      });

      // Create new permissions
      const permissionData = [
        // Always include PROFILE with ALL access
        {
          roleId: id,
          module: "PROFILE" as SystemModule,
          actions: ["ALL"] as PermissionAction[]
        },
        // Add other permissions
        ...permissions
          .filter((p: { module: string }) => p.module !== "PROFILE")
          .map((p: { module: string; actions: string[] }) => ({
            roleId: id,
            module: p.module as SystemModule,
            actions: p.actions as PermissionAction[]
          }))
      ];

      await prisma.rolePermission.createMany({
        data: permissionData
      });
    }

    // Fetch updated role with permissions
    const updatedRole = await prisma.userRole.findUnique({
      where: { id },
      include: {
        permissions: true,
        _count: {
          select: { users: true }
        }
      }
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}

// DELETE role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if user has permission to manage roles
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRole: {
          include: { permissions: true }
        }
      }
    });

    const hasRolePermission = currentUser?.userRole?.permissions.some(
      p => p.module === "ROLES" && (p.actions.includes("ALL") || p.actions.includes("DELETE"))
    ) || currentUser?.role === "ADMIN";

    if (!hasRolePermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Get existing role
    const existingRole = await prisma.userRole.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Prevent deleting system roles
    if (existingRole.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system roles" },
        { status: 400 }
      );
    }

    // Check if role is assigned to any users
    if (existingRole._count.users > 0) {
      return NextResponse.json(
        { error: `Cannot delete role. It is assigned to ${existingRole._count.users} user(s). Please reassign users first.` },
        { status: 400 }
      );
    }

    // Delete role (cascade will delete permissions)
    await prisma.userRole.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 }
    );
  }
}
