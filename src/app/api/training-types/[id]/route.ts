import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET single training type
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

    const trainingType = await prisma.trainingType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });

    if (!trainingType) {
      return NextResponse.json(
        { error: "Training type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(trainingType);
  } catch (error) {
    console.error("Error fetching training type:", error);
    return NextResponse.json(
      { error: "Failed to fetch training type" },
      { status: 500 }
    );
  }
}

// PUT update training type
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, startDate, isActive } = body;

    // Check if training type exists
    const existing = await prisma.trainingType.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Training type not found" },
        { status: 404 }
      );
    }

    // Check if new name conflicts with another training type
    if (name && name.trim() !== existing.name) {
      const nameConflict = await prisma.trainingType.findUnique({
        where: { name: name.trim() },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: "A training type with this name already exists" },
          { status: 400 }
        );
      }
    }

    const trainingType = await prisma.trainingType.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(trainingType);
  } catch (error) {
    console.error("Error updating training type:", error);
    return NextResponse.json(
      { error: "Failed to update training type" },
      { status: 500 }
    );
  }
}

// DELETE training type
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if training type is used by any projects
    const projectCount = await prisma.project.count({
      where: { trainingTypeId: id },
    });

    if (projectCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${projectCount} project(s) are using this training type. Please deactivate instead.` },
        { status: 400 }
      );
    }

    await prisma.trainingType.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Training type deleted successfully" });
  } catch (error) {
    console.error("Error deleting training type:", error);
    return NextResponse.json(
      { error: "Failed to delete training type" },
      { status: 500 }
    );
  }
}
