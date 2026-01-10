import prisma from "@/lib/prisma";

// Fields to exclude from logging (sensitive)
const EXCLUDED_FIELDS = [
  "password",
  "pin",
  "salary",
  "slab",
  "jobGrade",
  "lastSlabChange",
  "secondLastSlabChange",
  "lastGradeChange",
  "secondLastGradeChange",
];

// Human-readable field names
const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  whatsappNumber: "WhatsApp Number",
  dateOfBirth: "Date of Birth",
  gender: "Gender",
  address: "Address",
  profileImage: "Profile Image",
  employeeId: "Employee ID",
  designation: "Designation (Legacy)",
  designationId: "Designation",
  department: "Department (Legacy)",
  departmentId: "Department",
  joiningDate: "Joining Date",
  joiningDateBrac: "Joining Date in BRAC",
  joiningDateCurrentBase: "Joining Date (Current Base)",
  joiningDateCurrentPosition: "Joining Date (Current Position)",
  contractEndDate: "Contract End Date",
  employmentStatusId: "Employment Status",
  employmentTypeId: "Employment Type",
  firstSupervisorId: "1st Supervisor",
  yearsOfExperience: "Years of Experience",
  userRoleId: "Role",
  isActive: "Account Status",
  approvalStatus: "Approval Status",
  pmsMarkLastYear: "PMS Mark (Last Year)",
  pmsMarkSecondLastYear: "PMS Mark (2nd Last Year)",
  pmsMarkThirdLastYear: "PMS Mark (3rd Last Year)",
  lastWarningDate: "Last Warning Date",
  secondLastWarningDate: "2nd Last Warning Date",
  thirdLastWarningDate: "3rd Last Warning Date",
  lastOneOffBonus: "Last One-Off Bonus",
  secondLastOneOffBonus: "2nd Last One-Off Bonus",
};

// Category mapping for fields
const FIELD_CATEGORIES: Record<string, string> = {
  name: "PERSONAL",
  phone: "PERSONAL",
  whatsappNumber: "PERSONAL",
  dateOfBirth: "PERSONAL",
  gender: "PERSONAL",
  address: "PERSONAL",
  profileImage: "PERSONAL",
  email: "JOB",
  employeeId: "JOB",
  designation: "JOB",
  designationId: "JOB",
  department: "JOB",
  departmentId: "JOB",
  joiningDate: "JOB",
  joiningDateBrac: "JOB",
  joiningDateCurrentBase: "JOB",
  joiningDateCurrentPosition: "JOB",
  contractEndDate: "JOB",
  employmentStatusId: "JOB",
  employmentTypeId: "JOB",
  firstSupervisorId: "JOB",
  yearsOfExperience: "JOB",
  userRoleId: "JOB",
  isActive: "JOB",
  approvalStatus: "JOB",
  pmsMarkLastYear: "PERFORMANCE",
  pmsMarkSecondLastYear: "PERFORMANCE",
  pmsMarkThirdLastYear: "PERFORMANCE",
  lastWarningDate: "PERFORMANCE",
  secondLastWarningDate: "PERFORMANCE",
  thirdLastWarningDate: "PERFORMANCE",
  lastOneOffBonus: "PERFORMANCE",
  secondLastOneOffBonus: "PERFORMANCE",
};

interface LogActivityParams {
  userId: string;
  editorId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  category: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  description?: string;
}

export async function logUserActivity(params: LogActivityParams) {
  const { userId, editorId, action, category, field, oldValue, newValue, description } = params;
  
  try {
    await prisma.userActivityLog.create({
      data: {
        userId,
        editorId,
        action,
        category,
        field: field || null,
        oldValue: oldValue !== undefined ? JSON.stringify(oldValue) : null,
        newValue: newValue !== undefined ? JSON.stringify(newValue) : null,
        description: description || null,
      },
    });
  } catch (error) {
    console.error("Error logging user activity:", error);
    // Don't throw - logging should not break the main operation
  }
}

interface ChangeEntry {
  field: string;
  label: string;
  category: string;
  oldValue: unknown;
  newValue: unknown;
}

export function detectUserChanges(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): ChangeEntry[] {
  const changes: ChangeEntry[] = [];
  
  for (const [field, newValue] of Object.entries(newData)) {
    // Skip excluded fields
    if (EXCLUDED_FIELDS.includes(field)) continue;
    
    // Skip fields not in our mapping (internal fields)
    if (!FIELD_LABELS[field] && !field.endsWith("Id")) continue;
    
    const oldValue = oldData[field];
    
    // Normalize values for comparison
    const normalizedOld = normalizeValue(oldValue);
    const normalizedNew = normalizeValue(newValue);
    
    // Compare values
    if (JSON.stringify(normalizedOld) !== JSON.stringify(normalizedNew)) {
      changes.push({
        field,
        label: FIELD_LABELS[field] || field,
        category: FIELD_CATEGORIES[field] || "OTHER",
        oldValue: normalizedOld,
        newValue: normalizedNew,
      });
    }
  }
  
  return changes;
}

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string" && !isNaN(Date.parse(value))) {
    // Check if it looks like a date string
    if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(value).toISOString();
    }
  }
  return value;
}

export async function logUserChanges(
  userId: string,
  editorId: string,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
  action: "CREATE" | "UPDATE" | "DELETE" = "UPDATE"
) {
  const changes = detectUserChanges(oldData, newData);
  
  for (const change of changes) {
    const description = generateChangeDescription(change, action);
    
    await logUserActivity({
      userId,
      editorId,
      action,
      category: change.category,
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
      description,
    });
  }
  
  return changes;
}

function generateChangeDescription(change: ChangeEntry, action: string): string {
  if (action === "CREATE") {
    return `Set ${change.label} to "${formatDisplayValue(change.newValue)}"`;
  }
  
  if (action === "DELETE") {
    return `Removed ${change.label}`;
  }
  
  if (change.oldValue === null && change.newValue !== null) {
    return `Set ${change.label} to "${formatDisplayValue(change.newValue)}"`;
  }
  
  if (change.oldValue !== null && change.newValue === null) {
    return `Cleared ${change.label} (was "${formatDisplayValue(change.oldValue)}")`;
  }
  
  return `Changed ${change.label} from "${formatDisplayValue(change.oldValue)}" to "${formatDisplayValue(change.newValue)}"`;
}

function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return String(value);
}

// Log branch assignment changes
export async function logBranchAssignment(
  userId: string,
  editorId: string,
  action: "ADD" | "REMOVE",
  branchName: string,
  projectName: string,
  cohortName: string
) {
  const description = action === "ADD"
    ? `Assigned to branch "${branchName}" in ${projectName} / ${cohortName}`
    : `Removed from branch "${branchName}" in ${projectName} / ${cohortName}`;
  
  await logUserActivity({
    userId,
    editorId,
    action: action === "ADD" ? "CREATE" : "DELETE",
    category: "BRANCH_ASSIGNMENT",
    description,
  });
}

// Log project assignment changes
export async function logProjectAssignment(
  userId: string,
  editorId: string,
  action: "ADD" | "REMOVE",
  projectName: string,
  cohortName: string
) {
  const description = action === "ADD"
    ? `Assigned to project "${projectName}" / cohort "${cohortName}"`
    : `Removed from project "${projectName}" / cohort "${cohortName}"`;
  
  await logUserActivity({
    userId,
    editorId,
    action: action === "ADD" ? "CREATE" : "DELETE",
    category: "PROJECT_ASSIGNMENT",
    description,
  });
}
