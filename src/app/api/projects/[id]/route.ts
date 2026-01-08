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

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        cohorts: {
          include: {
            _count: {
              select: { batches: true, directBranches: true },
            },
            focalPerson: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        focalPerson: {
          select: { id: true, name: true, email: true },
        },
        modelType: {
          select: { id: true, name: true },
        },
        trainingType: {
          select: { id: true, name: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
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
    const { name, donorName, startDate, endDate, description, isActive, focalPersonId, modelTypeId, trainingTypeId } = body;

    // If trying to deactivate, check for active cohorts
    if (isActive === false) {
      const activeCohorts = await prisma.cohort.count({
        where: {
          projectId: id,
          isActive: true,
        },
      });

      if (activeCohorts > 0) {
        return NextResponse.json(
          { error: `Cannot deactivate project. ${activeCohorts} active cohort(s) exist. Please deactivate all cohorts first.` },
          { status: 400 }
        );
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        donorName,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description,
        isActive,
        focalPersonId: focalPersonId || null,
        modelTypeId: modelTypeId || null,
        trainingTypeId: trainingTypeId || null,
      },
    });

    return NextResponse.json({
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
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

    // Check DELETE permission on PROJECTS module
    const canDeleteProjects = await checkPermission(session.user.id, "PROJECTS", "DELETE");
    if (!canDeleteProjects) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
