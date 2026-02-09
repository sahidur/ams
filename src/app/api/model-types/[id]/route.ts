import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkPermission } from "@/lib/permissions";

// GET single model type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const modelType = await prisma.projectModelType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });

    if (!modelType) {
      return NextResponse.json(
        { error: "Model type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(modelType);
  } catch (error) {
    console.error("Error fetching model type:", error);
    return NextResponse.json(
      { error: "Failed to fetch model type" },
      { status: 500 }
    );
  }
}

// PUT update model type
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasWritePermission = await checkPermission(session.user.id, "MODEL_TYPES", "WRITE");
    if (!hasWritePermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, startDate, isActive } = body;

    // Check if model type exists
    const existing = await prisma.projectModelType.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Model type not found" },
        { status: 404 }
      );
    }

    // Check if new name conflicts with another model type
    if (name && name.trim() !== existing.name) {
      const nameConflict = await prisma.projectModelType.findUnique({
        where: { name: name.trim() },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: "A model type with this name already exists" },
          { status: 400 }
        );
      }
    }

    const modelType = await prisma.projectModelType.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(modelType);
  } catch (error) {
    console.error("Error updating model type:", error);
    return NextResponse.json(
      { error: "Failed to update model type" },
      { status: 500 }
    );
  }
}

// DELETE model type
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasDeletePermission = await checkPermission(session.user.id, "MODEL_TYPES", "DELETE");
    if (!hasDeletePermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if model type is used by any projects
    const projectCount = await prisma.project.count({
      where: { modelTypeId: id },
    });

    if (projectCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${projectCount} project(s) are using this model type. Please deactivate instead.` },
        { status: 400 }
      );
    }

    await prisma.projectModelType.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Model type deleted successfully" });
  } catch (error) {
    console.error("Error deleting model type:", error);
    return NextResponse.json(
      { error: "Failed to delete model type" },
      { status: 500 }
    );
  }
}
