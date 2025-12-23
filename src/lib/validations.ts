import { z } from "zod";

// Bangladesh phone number regex: +880 or 880 followed by 10 digits, or 01X followed by 8 digits
const bangladeshPhoneRegex = /^(?:\+?880|0)1[3-9]\d{8}$/;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string()
    .min(1, "Phone number is required")
    .regex(bangladeshPhoneRegex, "Invalid Bangladesh phone number (e.g., 01712345678 or +8801712345678)"),
  pin: z.string().length(6, "PIN must be exactly 6 digits").regex(/^\d{6}$/, "PIN must be 6 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string()
    .min(1, "Phone number is required")
    .regex(bangladeshPhoneRegex, "Invalid Bangladesh phone number (e.g., 01712345678 or +8801712345678)"),
  role: z.enum(["ADMIN", "HO_USER", "TRAINER", "STUDENT", "BASIC_USER"]),
  designation: z.string().optional(),
  department: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
});

export const projectSchema = z.object({
  name: z.string().min(2, "Project name is required"),
  donorName: z.string().min(2, "Donor name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  description: z.string().optional(),
});

export const cohortSchema = z.object({
  name: z.string().min(2, "Cohort name is required"),
  projectId: z.string().min(1, "Project is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

export const branchSchema = z.object({
  division: z.string().min(1, "Division is required"),
  district: z.string().min(1, "District is required"),
  upazila: z.string().min(1, "Upazila is required"),
  branchName: z.string().min(1, "Branch name is required"),
  branchCode: z.string().optional(),
});

export const batchSchema = z.object({
  name: z.string().min(1, "Batch name is required"),
  cohortId: z.string().optional(),
  branchId: z.string().min(1, "Branch is required"),
  trainerId: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

export const classSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  subject: z.string().min(1, "Subject is required"),
  batchId: z.string().min(1, "Batch is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  description: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type CohortInput = z.infer<typeof cohortSchema>;
export type BranchInput = z.infer<typeof branchSchema>;
export type BatchInput = z.infer<typeof batchSchema>;
export type ClassInput = z.infer<typeof classSchema>;

// Form data types (for react-hook-form)
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type ProjectFormData = z.infer<typeof projectSchema>;
export type CohortFormData = z.infer<typeof cohortSchema>;
export type BranchFormData = z.infer<typeof branchSchema>;
export type BatchFormData = z.infer<typeof batchSchema>;
export type ClassFormData = z.infer<typeof classSchema>;
