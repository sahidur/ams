import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET: Get user's branch assignments
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || session.user.id;
    const projectId = searchParams.get("projectId");
    const cohortId = searchParams.get("cohortId");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId };
    if (projectId) where.projectId = projectId;
    if (cohortId) where.cohortId = cohortId;

    const assignments = await prisma.userBranchAssignment.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true }
        },
        cohort: {
          select: { id: true, cohortId: true, name: true }
        },
        branch: {
          select: { id: true, branchName: true, branchCode: true, division: true, district: true, upazila: true }
        }
      },
      orderBy: [
        { project: { name: 'asc' } },
        { cohort: { name: 'asc' } },
        { branch: { branchName: 'asc' } }
      ]
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error fetching branch assignments:", error);
    return NextResponse.json({ error: "Failed to fetch branch assignments" }, { status: 500 });
  }
}

// POST: Create or update user branch assignments
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, cohortId, branchIds } = body;

    if (!projectId || !cohortId) {
      return NextResponse.json({ error: "Project and Cohort are required" }, { status: 400 });
    }

    if (!Array.isArray(branchIds)) {
      return NextResponse.json({ error: "branchIds must be an array" }, { status: 400 });
    }

    const userId = session.user.id;

    // Delete existing assignments for this user/project/cohort combination
    await prisma.userBranchAssignment.deleteMany({
      where: {
        userId,
        projectId,
        cohortId
      }
    });

    // Create new assignments
    if (branchIds.length > 0) {
      const assignments = branchIds.map((branchId: string) => ({
        userId,
        projectId,
        cohortId,
        branchId
      }));

      await prisma.userBranchAssignment.createMany({
        data: assignments,
        skipDuplicates: true
      });
    }

    // Fetch updated assignments
    const updatedAssignments = await prisma.userBranchAssignment.findMany({
      where: {
        userId,
        projectId,
        cohortId
      },
      include: {
        branch: {
          select: { id: true, branchName: true, branchCode: true, division: true, district: true, upazila: true }
        }
      }
    });

    return NextResponse.json({
      message: "Branch assignments updated successfully",
      assignments: updatedAssignments
    });
  } catch (error) {
    console.error("Error updating branch assignments:", error);
    return NextResponse.json({ error: "Failed to update branch assignments" }, { status: 500 });
  }
}

// DELETE: Remove all branch assignments for a project/cohort
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const cohortId = searchParams.get("cohortId");

    if (!projectId || !cohortId) {
      return NextResponse.json({ error: "Project and Cohort are required" }, { status: 400 });
    }

    await prisma.userBranchAssignment.deleteMany({
      where: {
        userId: session.user.id,
        projectId,
        cohortId
      }
    });

    return NextResponse.json({ message: "Branch assignments removed successfully" });
  } catch (error) {
    console.error("Error deleting branch assignments:", error);
    return NextResponse.json({ error: "Failed to delete branch assignments" }, { status: 500 });
  }
}
