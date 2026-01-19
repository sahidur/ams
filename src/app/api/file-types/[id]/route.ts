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

    const fileType = await prisma.fileType.findUnique({
      where: { id },
      include: {
        department: {
          select: { id: true, name: true },
        },
        _count: {
          select: { knowledgeFiles: true },
        },
      },
    });

    if (!fileType) {
      return NextResponse.json(
        { error: "File type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(fileType);
  } catch (error) {
    console.error("Error fetching file type:", error);
    return NextResponse.json(
      { error: "Failed to fetch file type" },
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
    const { name, description, departmentId, isActive, sortOrder } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if name is already taken by another file type
    const existing = await prisma.fileType.findFirst({
      where: {
        name: name.trim(),
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A file type with this name already exists" },
        { status: 400 }
      );
    }

    const fileType = await prisma.fileType.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        departmentId: departmentId || null,
        isActive: isActive !== false,
        sortOrder: sortOrder ?? 0,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      message: "File type updated successfully",
      fileType,
    });
  } catch (error) {
    console.error("Error updating file type:", error);
    return NextResponse.json(
      { error: "Failed to update file type" },
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

    // Check if file type is in use
    const filesCount = await prisma.knowledgeFile.count({
      where: { fileTypeId: id },
    });

    if (filesCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete file type with ${filesCount} associated file(s)` },
        { status: 400 }
      );
    }

    await prisma.fileType.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "File type deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting file type:", error);
    return NextResponse.json(
      { error: "Failed to delete file type" },
      { status: 500 }
    );
  }
}
