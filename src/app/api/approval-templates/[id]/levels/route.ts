import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET approval levels for a template
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
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const cohortId = searchParams.get("cohortId");

    const where: {
      templateId: string;
      projectId?: string | null;
      cohortId?: string | null;
    } = { templateId: id };

    // Filter by project/cohort if provided
    if (projectId) {
      where.projectId = projectId;
    }
    if (cohortId) {
      where.cohortId = cohortId;
    }

    const levels = await prisma.approvalLevel.findMany({
      where,
      include: {
        approvers: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            userRole: { select: { id: true, displayName: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
        project: { select: { id: true, name: true } },
        cohort: { select: { id: true, name: true } },
      },
      orderBy: { levelNumber: "asc" },
    });

    return NextResponse.json(levels);
  } catch (error) {
    console.error("Error fetching approval levels:", error);
    return NextResponse.json(
      { error: "Failed to fetch approval levels" },
      { status: 500 }
    );
  }
}

// POST create or replace approval levels
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { levels, projectId, cohortId, replaceExisting = true } = body;

    if (!Array.isArray(levels)) {
      return NextResponse.json(
        { error: "Levels must be an array" },
        { status: 400 }
      );
    }

    // Verify template exists
    const template = await prisma.approvalTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Delete existing levels for this scope if replacing
    if (replaceExisting) {
      const existingLevels = await prisma.approvalLevel.findMany({
        where: {
          templateId: id,
          projectId: projectId || null,
          cohortId: cohortId || null,
        },
        select: { id: true },
      });

      // Delete approvers first
      await prisma.approvalLevelApprover.deleteMany({
        where: {
          levelId: { in: existingLevels.map((l) => l.id) },
        },
      });

      // Then delete levels
      await prisma.approvalLevel.deleteMany({
        where: {
          templateId: id,
          projectId: projectId || null,
          cohortId: cohortId || null,
        },
      });
    }

    // Create new levels with approvers
    for (const level of levels) {
      await prisma.approvalLevel.create({
        data: {
          templateId: id,
          levelNumber: level.levelNumber,
          levelName: level.levelName,
          projectId: projectId || null,
          cohortId: cohortId || null,
          slaHours: level.slaHours,
          escalateAfterHours: level.escalateAfterHours,
          escalateToUserId: level.escalateToUserId,
          approvers: level.approvers?.length ? {
            create: level.approvers.map((approver: {
              userId?: string;
              userRoleId?: string;
              isRequesterSupervisor?: boolean;
            }, idx: number) => ({
              userId: approver.userId || null,
              userRoleId: approver.userRoleId || null,
              isRequesterSupervisor: approver.isRequesterSupervisor || false,
              sortOrder: idx,
            })),
          } : undefined,
        },
      });
    }

    // Fetch and return the created levels
    const newLevels = await prisma.approvalLevel.findMany({
      where: {
        templateId: id,
        projectId: projectId || null,
        cohortId: cohortId || null,
      },
      include: {
        approvers: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            userRole: { select: { id: true, displayName: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { levelNumber: "asc" },
    });

    return NextResponse.json(newLevels, { status: 201 });
  } catch (error) {
    console.error("Error saving approval levels:", error);
    return NextResponse.json(
      { error: "Failed to save approval levels" },
      { status: 500 }
    );
  }
}
