import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkPermission } from "@/lib/permissions";

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

    const department = await prisma.fileDepartment.findUnique({
      where: { id },
      include: {
        fileTypes: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
        _count: {
          select: { knowledgeFiles: true },
        },
      },
    });

    if (!department) {
      return NextResponse.json(
        { error: "File department not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(department);
  } catch (error) {
    console.error("Error fetching file department:", error);
    return NextResponse.json(
      { error: "Failed to fetch file department" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermissionResult = await checkPermission(session.user.id, "KNOWLEDGE_BASE", "WRITE");
    if (!hasPermissionResult) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, isActive, sortOrder } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if name is already taken by another department
    const existing = await prisma.fileDepartment.findFirst({
      where: {
        name: name.trim(),
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A department with this name already exists" },
        { status: 400 }
      );
    }

    const department = await prisma.fileDepartment.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: isActive !== false,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json({
      message: "File department updated successfully",
      department,
    });
  } catch (error) {
    console.error("Error updating file department:", error);
    return NextResponse.json(
      { error: "Failed to update file department" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermissionResult = await checkPermission(session.user.id, "KNOWLEDGE_BASE", "DELETE");
    if (!hasPermissionResult) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;

    // Check if department is in use
    const filesCount = await prisma.knowledgeFile.count({
      where: { departmentId: id },
    });

    if (filesCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete department with ${filesCount} associated file(s)` },
        { status: 400 }
      );
    }

    await prisma.fileDepartment.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "File department deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting file department:", error);
    return NextResponse.json(
      { error: "Failed to delete file department" },
      { status: 500 }
    );
  }
}
