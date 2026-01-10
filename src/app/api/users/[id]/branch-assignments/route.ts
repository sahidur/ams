import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkPermission } from "@/lib/permissions";
import { logBranchAssignment } from "@/lib/activity-log";

// GET: Fetch all branch assignments for a user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: userId } = await params;
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignments = await prisma.userBranchAssignment.findMany({
      where: { userId },
      include: {
        project: {
          select: { id: true, name: true },
        },
        cohort: {
          select: { id: true, cohortId: true, name: true },
        },
        branch: {
          select: {
            id: true,
            branchName: true,
            branchCode: true,
            division: true,
            district: true,
            upazila: true,
          },
        },
      },
      orderBy: [
        { project: { name: "asc" } },
        { cohort: { name: "asc" } },
        { branch: { branchName: "asc" } },
      ],
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error fetching branch assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch branch assignments" },
      { status: 500 }
    );
  }
}

// POST: Add branch assignments for a user
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: userId } = await params;
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check WRITE permission on USERS module
    const canWrite = await checkPermission(session.user.id, "USERS", "WRITE");
    if (!canWrite) {
      return NextResponse.json(
        { error: "You don't have permission to assign branches" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { projectId, cohortId, branchIds } = body;

    if (!projectId || !cohortId || !branchIds || branchIds.length === 0) {
      return NextResponse.json(
        { error: "Project, cohort, and at least one branch are required" },
        { status: 400 }
      );
    }

    // Verify user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get project and cohort names for logging
    const [projectData, cohortData] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
      prisma.cohort.findUnique({ where: { id: cohortId }, select: { name: true } }),
    ]);

    // Get existing assignments for comparison
    const existingAssignments = await prisma.userBranchAssignment.findMany({
      where: { userId, projectId, cohortId },
      include: { branch: { select: { id: true, branchName: true } } },
    });
    const existingBranchIds = existingAssignments.map(a => a.branchId);

    // Delete existing assignments for this project/cohort combination
    await prisma.userBranchAssignment.deleteMany({
      where: {
        userId,
        projectId,
        cohortId,
      },
    });

    // Create new assignments
    const assignments = await prisma.userBranchAssignment.createMany({
      data: branchIds.map((branchId: string) => ({
        userId,
        projectId,
        cohortId,
        branchId,
      })),
    });

    // Get branch names for logging
    const branches = await prisma.branch.findMany({
      where: { id: { in: branchIds } },
      select: { id: true, branchName: true },
    });
    const branchMap = new Map(branches.map(b => [b.id, b.branchName]));

    // Log added branches
    for (const branchId of branchIds) {
      if (!existingBranchIds.includes(branchId)) {
        const branchName = branchMap.get(branchId) || "Unknown";
        await logBranchAssignment(
          userId,
          session.user.id,
          "ADD",
          branchName,
          projectData?.name || "Unknown",
          cohortData?.name || "Unknown"
        );
      }
    }

    // Log removed branches
    for (const existing of existingAssignments) {
      if (!branchIds.includes(existing.branchId)) {
        await logBranchAssignment(
          userId,
          session.user.id,
          "REMOVE",
          existing.branch.branchName,
          projectData?.name || "Unknown",
          cohortData?.name || "Unknown"
        );
      }
    }

    return NextResponse.json({ 
      message: "Branch assignments saved successfully",
      count: assignments.count,
    }, { status: 201 });
  } catch (error) {
    console.error("Error saving branch assignments:", error);
    return NextResponse.json(
      { error: "Failed to save branch assignments" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a specific branch assignment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: userId } = await params;
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check WRITE permission on USERS module
    const canWrite = await checkPermission(session.user.id, "USERS", "WRITE");
    if (!canWrite) {
      return NextResponse.json(
        { error: "You don't have permission to remove branch assignments" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    // Verify assignment exists and belongs to this user
    const assignment = await prisma.userBranchAssignment.findFirst({
      where: {
        id: assignmentId,
        userId,
      },
      include: {
        project: { select: { name: true } },
        cohort: { select: { name: true } },
        branch: { select: { branchName: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    await prisma.userBranchAssignment.delete({
      where: { id: assignmentId },
    });

    // Log the branch assignment removal
    await logBranchAssignment(
      userId,
      session.user.id,
      "REMOVE",
      assignment.branch.branchName,
      assignment.project.name,
      assignment.cohort.name
    );

    return NextResponse.json({ message: "Assignment removed successfully" });
  } catch (error) {
    console.error("Error removing branch assignment:", error);
    return NextResponse.json(
      { error: "Failed to remove branch assignment" },
      { status: 500 }
    );
  }
}
