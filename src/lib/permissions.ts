// @ts-nocheck
// TODO: Remove @ts-nocheck after running prisma db push and prisma generate
import prisma from "@/lib/prisma";

export type ModuleName = 
  | "DASHBOARD"
  | "USERS"
  | "ROLES"
  | "PROJECTS"
  | "BRANCHES"
  | "BATCHES"
  | "CLASSES"
  | "ATTENDANCE"
  | "FACE_TRAINING"
  | "PROFILE";

export type PermissionAction = "READ" | "WRITE" | "DELETE" | "ALL";

export interface UserPermissions {
  userId: string;
  roleId: string | null;
  roleName: string | null;
  isActive: boolean;
  permissions: Map<ModuleName, PermissionAction[]>;
}

/**
 * Get permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRole: {
        include: {
          permissions: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const permissions = new Map<ModuleName, PermissionAction[]>();

  // If user has new role system
  if (user.userRole) {
    user.userRole.permissions.forEach((perm) => {
      permissions.set(perm.module as ModuleName, perm.actions as PermissionAction[]);
    });

    return {
      userId: user.id,
      roleId: user.userRoleId,
      roleName: user.userRole.name,
      isActive: user.userRole.isActive,
      permissions,
    };
  }

  // Fallback to old role system
  const legacyPermissions = getLegacyRolePermissions(user.role);
  return {
    userId: user.id,
    roleId: null,
    roleName: user.role,
    isActive: true,
    permissions: legacyPermissions,
  };
}

/**
 * Check if a user has permission for a specific action on a module
 */
export async function hasPermission(
  userId: string,
  module: ModuleName,
  action: PermissionAction
): Promise<boolean> {
  const userPerms = await getUserPermissions(userId);
  
  if (!userPerms) {
    return false;
  }

  // If role is not active, deny all access except profile
  if (!userPerms.isActive && module !== "PROFILE") {
    return false;
  }

  const modulePerms = userPerms.permissions.get(module);
  
  if (!modulePerms || modulePerms.length === 0) {
    return false;
  }

  // ALL grants all permissions
  if (modulePerms.includes("ALL")) {
    return true;
  }

  return modulePerms.includes(action);
}

/**
 * Check if a user can read a module
 */
export async function canRead(userId: string, module: ModuleName): Promise<boolean> {
  return hasPermission(userId, module, "READ") || hasPermission(userId, module, "ALL");
}

/**
 * Check if a user can write to a module
 */
export async function canWrite(userId: string, module: ModuleName): Promise<boolean> {
  return hasPermission(userId, module, "WRITE") || hasPermission(userId, module, "ALL");
}

/**
 * Check if a user can delete from a module
 */
export async function canDelete(userId: string, module: ModuleName): Promise<boolean> {
  return hasPermission(userId, module, "DELETE") || hasPermission(userId, module, "ALL");
}

/**
 * Get permissions for legacy role enum
 */
function getLegacyRolePermissions(role: string): Map<ModuleName, PermissionAction[]> {
  const permissions = new Map<ModuleName, PermissionAction[]>();

  switch (role) {
    case "ADMIN":
      // Admin has all permissions
      const allModules: ModuleName[] = [
        "DASHBOARD", "USERS", "ROLES", "PROJECTS", "BRANCHES",
        "BATCHES", "CLASSES", "ATTENDANCE", "FACE_TRAINING", "PROFILE"
      ];
      allModules.forEach((mod) => permissions.set(mod, ["ALL"]));
      break;

    case "HO_USER":
      permissions.set("DASHBOARD", ["READ"]);
      permissions.set("PROJECTS", ["READ"]);
      permissions.set("BRANCHES", ["READ"]);
      permissions.set("BATCHES", ["READ"]);
      permissions.set("CLASSES", ["READ"]);
      permissions.set("ATTENDANCE", ["READ"]);
      permissions.set("PROFILE", ["ALL"]);
      break;

    case "TRAINER":
      permissions.set("DASHBOARD", ["READ"]);
      permissions.set("BATCHES", ["READ"]);
      permissions.set("CLASSES", ["READ", "WRITE"]);
      permissions.set("ATTENDANCE", ["READ", "WRITE"]);
      permissions.set("FACE_TRAINING", ["READ", "WRITE"]);
      permissions.set("PROFILE", ["ALL"]);
      break;

    case "STUDENT":
      permissions.set("DASHBOARD", ["READ"]);
      permissions.set("CLASSES", ["READ"]);
      permissions.set("ATTENDANCE", ["READ"]);
      permissions.set("PROFILE", ["ALL"]);
      break;

    case "BASIC_USER":
    default:
      permissions.set("DASHBOARD", ["READ"]);
      permissions.set("PROFILE", ["ALL"]);
      break;
  }

  return permissions;
}

/**
 * Get all permissions for a user as a plain object (for client-side use)
 */
export async function getUserPermissionsObject(userId: string): Promise<Record<string, string[]> | null> {
  const userPerms = await getUserPermissions(userId);
  
  if (!userPerms) {
    return null;
  }

  const result: Record<string, string[]> = {};
  userPerms.permissions.forEach((actions, module) => {
    result[module] = actions;
  });

  return result;
}
