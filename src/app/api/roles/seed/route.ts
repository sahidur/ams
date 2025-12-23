// @ts-nocheck
// TODO: Remove @ts-nocheck after running prisma db push and prisma generate
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SystemModule, PermissionAction } from "@prisma/client";

// POST seed initial roles
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow if no roles exist or user is admin
    const existingRoles = await prisma.userRole.count();
    
    if (existingRoles > 0) {
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id }
      });
      
      if (currentUser?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Roles already exist. Only admin can reseed." },
          { status: 403 }
        );
      }
    }

    const allModules: SystemModule[] = [
      "DASHBOARD",
      "USERS",
      "ROLES",
      "PROJECTS",
      "BRANCHES",
      "BATCHES",
      "CLASSES",
      "ATTENDANCE",
      "FACE_TRAINING",
      "PROFILE"
    ];

    const allActions: PermissionAction[] = ["ALL"];

    // Create Super Admin role
    const superAdminRole = await prisma.userRole.upsert({
      where: { name: "SUPER_ADMIN" },
      update: {},
      create: {
        name: "SUPER_ADMIN",
        displayName: "Super Admin",
        description: "Has all master access to everything including system settings",
        isActive: true,
        isSystem: true,
        permissions: {
          create: allModules.map(module => ({
            module,
            actions: allActions
          }))
        }
      }
    });

    // Create Admin role
    const adminRole = await prisma.userRole.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: {
        name: "ADMIN",
        displayName: "Admin",
        description: "Has all access to manage the system",
        isActive: true,
        isSystem: true,
        permissions: {
          create: allModules.map(module => ({
            module,
            actions: allActions
          }))
        }
      }
    });

    // Create HO User role
    const hoUserRole = await prisma.userRole.upsert({
      where: { name: "HO_USER" },
      update: {},
      create: {
        name: "HO_USER",
        displayName: "HO User",
        description: "Head Office user with reporting access",
        isActive: true,
        isSystem: true,
        permissions: {
          create: [
            { module: "DASHBOARD" as SystemModule, actions: ["READ"] as PermissionAction[] },
            { module: "PROJECTS" as SystemModule, actions: ["READ"] as PermissionAction[] },
            { module: "BRANCHES" as SystemModule, actions: ["READ"] as PermissionAction[] },
            { module: "BATCHES" as SystemModule, actions: ["READ"] as PermissionAction[] },
            { module: "CLASSES" as SystemModule, actions: ["READ"] as PermissionAction[] },
            { module: "ATTENDANCE" as SystemModule, actions: ["READ"] as PermissionAction[] },
            { module: "PROFILE" as SystemModule, actions: ["ALL"] as PermissionAction[] },
          ]
        }
      }
    });

    // Create Trainer role
    const trainerRole = await prisma.userRole.upsert({
      where: { name: "TRAINER" },
      update: {},
      create: {
        name: "TRAINER",
        displayName: "Trainer",
        description: "Manages batches, classes, and attendance",
        isActive: true,
        isSystem: true,
        permissions: {
          create: [
            { module: "DASHBOARD" as SystemModule, actions: ["READ"] as PermissionAction[] },
            { module: "BATCHES" as SystemModule, actions: ["READ"] as PermissionAction[] },
            { module: "CLASSES" as SystemModule, actions: ["READ", "WRITE"] as PermissionAction[] },
            { module: "ATTENDANCE" as SystemModule, actions: ["READ", "WRITE"] as PermissionAction[] },
            { module: "FACE_TRAINING" as SystemModule, actions: ["READ", "WRITE"] as PermissionAction[] },
            { module: "PROFILE" as SystemModule, actions: ["ALL"] as PermissionAction[] },
          ]
        }
      }
    });

    // Create Student role
    const studentRole = await prisma.userRole.upsert({
      where: { name: "STUDENT" },
      update: {},
      create: {
        name: "STUDENT",
        displayName: "Student",
        description: "Views own attendance and class schedules",
        isActive: true,
        isSystem: true,
        permissions: {
          create: [
            { module: "DASHBOARD" as SystemModule, actions: ["READ"] as PermissionAction[] },
            { module: "CLASSES" as SystemModule, actions: ["READ"] as PermissionAction[] },
            { module: "ATTENDANCE" as SystemModule, actions: ["READ"] as PermissionAction[] },
            { module: "PROFILE" as SystemModule, actions: ["ALL"] as PermissionAction[] },
          ]
        }
      }
    });

    // Create Basic User role
    const basicUserRole = await prisma.userRole.upsert({
      where: { name: "BASIC_USER" },
      update: {},
      create: {
        name: "BASIC_USER",
        displayName: "Basic User",
        description: "Limited access",
        isActive: true,
        isSystem: true,
        permissions: {
          create: [
            { module: "DASHBOARD" as SystemModule, actions: ["READ"] as PermissionAction[] },
            { module: "PROFILE" as SystemModule, actions: ["ALL"] as PermissionAction[] },
          ]
        }
      }
    });

    // Update existing admin users to use the new ADMIN role
    await prisma.user.updateMany({
      where: { role: "ADMIN" },
      data: { userRoleId: adminRole.id }
    });

    // Update existing HO_USER to use new role
    await prisma.user.updateMany({
      where: { role: "HO_USER" },
      data: { userRoleId: hoUserRole.id }
    });

    // Update existing TRAINER to use new role
    await prisma.user.updateMany({
      where: { role: "TRAINER" },
      data: { userRoleId: trainerRole.id }
    });

    // Update existing STUDENT to use new role
    await prisma.user.updateMany({
      where: { role: "STUDENT" },
      data: { userRoleId: studentRole.id }
    });

    // Update existing BASIC_USER to use new role
    await prisma.user.updateMany({
      where: { role: "BASIC_USER" },
      data: { userRoleId: basicUserRole.id }
    });

    return NextResponse.json({
      success: true,
      message: "Initial roles created and users migrated",
      roles: {
        superAdmin: superAdminRole,
        admin: adminRole,
        hoUser: hoUserRole,
        trainer: trainerRole,
        student: studentRole,
        basicUser: basicUserRole
      }
    });
  } catch (error) {
    console.error("Error seeding roles:", error);
    return NextResponse.json(
      { error: "Failed to seed roles" },
      { status: 500 }
    );
  }
}
