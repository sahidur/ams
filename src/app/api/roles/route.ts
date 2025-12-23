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

// System modules list with display names
export const SYSTEM_MODULES = [
  { id: "DASHBOARD", name: "Dashboard", description: "Main dashboard access" },
  { id: "USERS", name: "Users", description: "User management" },
  { id: "ROLES", name: "Roles", description: "Role management" },
  { id: "PROJECTS", name: "Projects", description: "Project management" },
  { id: "BRANCHES", name: "Branches", description: "Branch management" },
  { id: "BATCHES", name: "Batches", description: "Batch management" },
  { id: "CLASSES", name: "Classes", description: "Class management" },
  { id: "ATTENDANCE", name: "Attendance", description: "Attendance management" },
  { id: "FACE_TRAINING", name: "Face Training", description: "Face recognition training" },
  { id: "PROFILE", name: "Profile", description: "User profile (default access)" },
] as const;

// GET all roles
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includePermissions = searchParams.get("includePermissions") === "true";
    const activeOnly = searchParams.get("activeOnly") === "true";

    const roles = await prisma.userRole.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: includePermissions ? {
        permissions: true,
        _count: {
          select: { users: true }
        }
      } : {
        _count: {
          select: { users: true }
        }
      },
      orderBy: [
        { isSystem: "desc" },
        { name: "asc" }
      ]
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

// POST create new role
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to manage roles (Admin or Super Admin)
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
    const { name, displayName, description, isActive, permissions } = body;

    if (!name || !displayName) {
      return NextResponse.json(
        { error: "Name and display name are required" },
        { status: 400 }
      );
    }

    // Check if role name already exists
    const existingRole = await prisma.userRole.findUnique({
      where: { name: name.toUpperCase().replace(/\s+/g, "_") }
    });

    if (existingRole) {
      return NextResponse.json(
        { error: "Role with this name already exists" },
        { status: 400 }
      );
    }

    // Create role with permissions
    const role = await prisma.userRole.create({
      data: {
        name: name.toUpperCase().replace(/\s+/g, "_"),
        displayName,
        description,
        isActive: isActive ?? true,
        isSystem: false,
        permissions: {
          create: [
            // Always add PROFILE access by default
            {
              module: "PROFILE" as SystemModule,
              actions: ["ALL"] as PermissionAction[]
            },
            // Add other permissions
            ...(permissions || []).filter((p: { module: string }) => p.module !== "PROFILE").map((p: { module: string; actions: string[] }) => ({
              module: p.module as SystemModule,
              actions: p.actions as PermissionAction[]
            }))
          ]
        }
      },
      include: {
        permissions: true
      }
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}
