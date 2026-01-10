import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkPermission } from "@/lib/permissions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        batches: true,
        cohort: {
          select: {
            id: true,
            cohortId: true,
            name: true,
            isActive: true,
            project: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
        cohorts: {
          include: {
            cohort: true,
          },
        },
      },
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    return NextResponse.json(branch);
  } catch (error) {
    console.error("Error fetching branch:", error);
    return NextResponse.json(
      { error: "Failed to fetch branch" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    
    if (!session || !["ADMIN", "HO_USER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { division, district, upazila, union, branchName, branchCode, cohortId, isActive } = body;

    // If cohortId is provided, validate it exists and is active
    if (cohortId) {
      const cohort = await prisma.cohort.findUnique({
        where: { id: cohortId },
        include: {
          project: {
            select: { isActive: true },
          },
        },
      });

      if (!cohort) {
        return NextResponse.json({ error: "Cohort not found" }, { status: 400 });
      }

      if (!cohort.isActive) {
        return NextResponse.json({ error: "Cohort is not active" }, { status: 400 });
      }

      if (!cohort.project.isActive) {
        return NextResponse.json({ error: "Project is not active" }, { status: 400 });
      }
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        division,
        district,
        upazila,
        union: union !== undefined ? (union || null) : undefined,
        branchName,
        branchCode: branchCode || null,
        cohortId: cohortId || null,
        isActive: isActive !== undefined ? isActive : undefined,
      },
      include: {
        cohort: {
          select: {
            id: true,
            cohortId: true,
            name: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: "Branch updated successfully",
      branch,
    });
  } catch (error) {
    console.error("Error updating branch:", error);
    return NextResponse.json(
      { error: "Failed to update branch" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check DELETE permission on BRANCHES module
    const canDeleteBranches = await checkPermission(session.user.id, "BRANCHES", "DELETE");
    if (!canDeleteBranches) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.branch.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Branch deleted successfully" });
  } catch (error) {
    console.error("Error deleting branch:", error);
    return NextResponse.json(
      { error: "Failed to delete branch" },
      { status: 500 }
    );
  }
}
