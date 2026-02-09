import prisma from "@/lib/prisma";

export type ModuleName = 
  | "DASHBOARD"
  | "USERS"
  | "ROLES"
  | "PROJECTS"
  | "COHORTS"
  | "BRANCHES"
  | "BATCHES"
  | "CLASSES"
  | "ATTENDANCE"
  | "FACE_TRAINING"
  | "MODEL_TYPES"
  | "TRAINING_TYPES"
  | "DESIGNATIONS"
  | "EMPLOYMENT_STATUSES"
  | "EMPLOYMENT_TYPES"
  | "DEPARTMENTS"
  | "GEO_ADMIN"
  | "PROFILE"
  | "KNOWLEDGE_BASE";

export type PermissionAction = "READ" | "WRITE" | "DELETE" | "ALL";

export interface UserPermissions {
  userId: string;
  roleId: string | null;
  roleName: string | null;
  isActive: boolean;
  permissions: Map<ModuleName, PermissionAction[]>;
}

/**
 * Check if a user has permission for a module action (simplified for API routes)
 * This is a quick check that doesn't require full permission loading
 */
export async function checkPermission(
  userId: string,
  module: ModuleName,
  action: PermissionAction
): Promise<boolean> {
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
    return false;
  }

  // Check new role-based permissions
  if (user.userRole) {
    // Role must be active
    if (!user.userRole.isActive) {
      return false;
    }

    const modulePermission = user.userRole.permissions.find(p => p.module === module);
    if (!modulePermission) {
      return false;
    }

    // ALL grants all permissions
    if (modulePermission.actions.includes("ALL")) {
      return true;
    }

    return modulePermission.actions.includes(action);
  }

  // Fallback to legacy role permissions
  return checkLegacyPermission(user.role, module, action);
}

/**
 * Check legacy role permission
 */
function checkLegacyPermission(role: string, module: ModuleName, action: PermissionAction): boolean {
  const legacyPermissions: Record<string, Record<string, string[]>> = {
    ADMIN: {
      DASHBOARD: ["ALL"], USERS: ["ALL"], ROLES: ["ALL"], PROJECTS: ["ALL"],
      COHORTS: ["ALL"], BRANCHES: ["ALL"], BATCHES: ["ALL"], CLASSES: ["ALL"], 
      ATTENDANCE: ["ALL"], FACE_TRAINING: ["ALL"], MODEL_TYPES: ["ALL"], 
      TRAINING_TYPES: ["ALL"], DESIGNATIONS: ["ALL"], EMPLOYMENT_STATUSES: ["ALL"],
      EMPLOYMENT_TYPES: ["ALL"], DEPARTMENTS: ["ALL"], GEO_ADMIN: ["ALL"], PROFILE: ["ALL"],
      KNOWLEDGE_BASE: ["ALL"]
    },
    HO_USER: {
      DASHBOARD: ["READ"], PROJECTS: ["READ"], COHORTS: ["READ"], BRANCHES: ["READ"],
      BATCHES: ["READ"], CLASSES: ["READ"], ATTENDANCE: ["READ"], 
      MODEL_TYPES: ["READ"], TRAINING_TYPES: ["READ"], PROFILE: ["ALL"],
      KNOWLEDGE_BASE: ["READ", "WRITE"]
    },
    TRAINER: {
      DASHBOARD: ["READ"], BATCHES: ["READ"], CLASSES: ["READ", "WRITE"],
      ATTENDANCE: ["READ", "WRITE"], FACE_TRAINING: ["READ", "WRITE"], PROFILE: ["ALL"]
    },
    STUDENT: {
      DASHBOARD: ["READ"], CLASSES: ["READ"], ATTENDANCE: ["READ"], PROFILE: ["ALL"]
    },
    BASIC_USER: {
      DASHBOARD: ["READ"], PROFILE: ["ALL"]
    }
  };

  const rolePerms = legacyPermissions[role];
  if (!rolePerms) return false;

  const modulePerms = rolePerms[module];
  if (!modulePerms) return false;

  if (modulePerms.includes("ALL")) return true;
  return modulePerms.includes(action);
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
        "DASHBOARD", "USERS", "ROLES", "PROJECTS", "COHORTS", "BRANCHES",
        "BATCHES", "CLASSES", "ATTENDANCE", "FACE_TRAINING", "MODEL_TYPES",
        "TRAINING_TYPES", "DESIGNATIONS", "EMPLOYMENT_STATUSES", "EMPLOYMENT_TYPES",
        "DEPARTMENTS", "GEO_ADMIN", "PROFILE", "KNOWLEDGE_BASE"
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
      permissions.set("KNOWLEDGE_BASE", ["READ", "WRITE"]);
      break;

    case "TRAINER":
      permissions.set("DASHBOARD", ["READ"]);
      permissions.set("BATCHES", ["READ"]);
      permissions.set("CLASSES", ["READ", "WRITE"]);
      permissions.set("ATTENDANCE", ["READ", "WRITE"]);
      permissions.set("FACE_TRAINING", ["READ", "WRITE"]);
      permissions.set("PROFILE", ["ALL"]);
      permissions.set("KNOWLEDGE_BASE", ["READ"]);
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

/**
 * Check if a user is a Super Admin
 * Super Admin is either a user with role "ADMIN" or has a userRole with name containing "Super"
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRole: true,
    },
  });

  if (!user) {
    return false;
  }

  // Check legacy ADMIN role
  if (user.role === "ADMIN") {
    return true;
  }

  // Check if userRole name is exactly "Super Admin" (case-insensitive)
  if (user.userRole?.name?.toLowerCase() === "super admin") {
    return true;
  }

  return false;
}
