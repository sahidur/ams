import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { checkPermission } from "@/lib/permissions";

// GET user project assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Allow users to view their own assignments or users with USERS READ permission
    const isSelf = session.user.id === id;
    if (!isSelf) {
      const hasPermission = await checkPermission(session.user.id, "USERS", "READ");
      if (!hasPermission) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const assignments = await prisma.userProjectAssignment.findMany({
      where: { userId: id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        cohort: {
          select: {
            id: true,
            cohortId: true,
            name: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { project: { name: "asc" } },
        { cohort: { name: "asc" } },
      ],
    });

    // Group assignments by project for easier display
    const groupedAssignments = assignments.reduce((acc, assignment) => {
      const projectId = assignment.project.id;
      if (!acc[projectId]) {
        acc[projectId] = {
          project: assignment.project,
          cohorts: [],
        };
      }
      acc[projectId].cohorts.push({
        assignmentId: assignment.id,
        cohort: assignment.cohort,
      });
      return acc;
    }, {} as Record<string, { project: typeof assignments[0]["project"]; cohorts: { assignmentId: string; cohort: typeof assignments[0]["cohort"] }[] }>);

    return NextResponse.json({
      assignments,
      grouped: Object.values(groupedAssignments),
    });
  } catch (error) {
    console.error("Error fetching user assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

// POST - Add new assignment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = await checkPermission(session.user.id, "USERS", "WRITE");
    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { projectId, cohortId } = body;

    if (!projectId || !cohortId) {
      return NextResponse.json(
        { error: "Project and cohort are required" },
        { status: 400 }
      );
    }

    // Verify the cohort belongs to the project
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      select: { projectId: true },
    });

    if (!cohort || cohort.projectId !== projectId) {
      return NextResponse.json(
        { error: "Cohort does not belong to the selected project" },
        { status: 400 }
      );
    }

    // Check if assignment already exists
    const existing = await prisma.userProjectAssignment.findUnique({
      where: {
        userId_projectId_cohortId: {
          userId: id,
          projectId,
          cohortId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This assignment already exists" },
        { status: 400 }
      );
    }

    const assignment = await prisma.userProjectAssignment.create({
      data: {
        userId: id,
        projectId,
        cohortId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        cohort: {
          select: {
            id: true,
            cohortId: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}

// DELETE - Remove an assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = await checkPermission(session.user.id, "USERS", "DELETE");
    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    await prisma.userProjectAssignment.delete({
      where: { id: assignmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json(
      { error: "Failed to delete assignment" },
      { status: 500 }
    );
  }
}
