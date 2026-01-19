import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const departmentId = searchParams.get("departmentId");

    const where: Record<string, unknown> = {};
    if (activeOnly) {
      where.isActive = true;
    }
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const fileTypes = await prisma.fileType.findMany({
      where,
      include: {
        department: {
          select: { id: true, name: true },
        },
        _count: {
          select: { knowledgeFiles: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(fileTypes);
  } catch (error) {
    console.error("Error fetching file types:", error);
    return NextResponse.json(
      { error: "Failed to fetch file types" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermissionResult = await checkPermission(session.user.id, "KNOWLEDGE_BASE", "WRITE");
    if (!hasPermissionResult) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, departmentId, isActive, sortOrder } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if file type already exists
    const existing = await prisma.fileType.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A file type with this name already exists" },
        { status: 400 }
      );
    }

    const fileType = await prisma.fileType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        departmentId: departmentId || null,
        isActive: isActive !== false,
        sortOrder: sortOrder || 0,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      message: "File type created successfully",
      fileType,
    });
  } catch (error) {
    console.error("Error creating file type:", error);
    return NextResponse.json(
      { error: "Failed to create file type" },
      { status: 500 }
    );
  }
}
