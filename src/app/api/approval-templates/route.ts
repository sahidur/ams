import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permissions";

// GET all approval templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const includeFields = searchParams.get("includeFields") === "true";
    const includeLevels = searchParams.get("includeLevels") === "true";

    const templates = await prisma.approvalTemplate.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        formFields: includeFields ? {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        } : false,
        levels: includeLevels ? {
          where: { isActive: true },
          orderBy: { levelNumber: "asc" },
          include: {
            approvers: {
              where: { isActive: true },
              include: {
                user: { select: { id: true, name: true, email: true } },
                userRole: { select: { id: true, displayName: true } },
              },
            },
            project: { select: { id: true, name: true } },
            cohort: { select: { id: true, name: true } },
          },
        } : false,
        _count: {
          select: { requests: true, levels: true, formFields: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching approval templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch approval templates" },
      { status: 500 }
    );
  }
}

// POST create new approval template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only users with WRITE permission can create templates
    const hasWritePermission = await checkPermission(session.user.id, "USERS", "WRITE");
    if (!hasWritePermission) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { name, displayName, description, icon, color, defaultSlaHours, formFields, levels } = body;

    if (!name || !displayName) {
      return NextResponse.json(
        { error: "Name and display name are required" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await prisma.approvalTemplate.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An approval template with this name already exists" },
        { status: 400 }
      );
    }

    // Create template with form fields and levels
    const template = await prisma.approvalTemplate.create({
      data: {
        name,
        displayName,
        description,
        icon,
        color,
        defaultSlaHours,
        createdById: session.user.id,
        formFields: formFields?.length > 0 ? {
          create: formFields.map((field: {
            fieldName: string;
            fieldLabel: string;
            fieldType: string;
            placeholder?: string;
            helpText?: string;
            isRequired?: boolean;
            options?: string[];
            validation?: string;
            defaultValue?: string;
            sortOrder?: number;
            dependsOnField?: string;
            dependsOnValue?: string;
          }, index: number) => ({
            fieldName: field.fieldName,
            fieldLabel: field.fieldLabel,
            fieldType: field.fieldType,
            placeholder: field.placeholder,
            helpText: field.helpText,
            isRequired: field.isRequired || false,
            options: field.options || [],
            validation: field.validation,
            defaultValue: field.defaultValue,
            sortOrder: field.sortOrder ?? index,
            dependsOnField: field.dependsOnField,
            dependsOnValue: field.dependsOnValue,
          })),
        } : undefined,
        levels: levels?.length > 0 ? {
          create: levels.map((level: {
            levelNumber: number;
            levelName: string;
            projectId?: string;
            cohortId?: string;
            slaHours?: number;
            approvers?: { userId?: string; userRoleId?: string; isRequesterSupervisor?: boolean }[];
          }) => ({
            levelNumber: level.levelNumber,
            levelName: level.levelName,
            projectId: level.projectId,
            cohortId: level.cohortId,
            slaHours: level.slaHours,
            approvers: level.approvers?.length ? {
              create: level.approvers.map((approver: {
                userId?: string;
                userRoleId?: string;
                isRequesterSupervisor?: boolean;
              }, idx: number) => ({
                userId: approver.userId,
                userRoleId: approver.userRoleId,
                isRequesterSupervisor: approver.isRequesterSupervisor || false,
                sortOrder: idx,
              })),
            } : undefined,
          })),
        } : undefined,
      },
      include: {
        formFields: true,
        levels: {
          include: {
            approvers: true,
          },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating approval template:", error);
    return NextResponse.json(
      { error: "Failed to create approval template" },
      { status: 500 }
    );
  }
}
