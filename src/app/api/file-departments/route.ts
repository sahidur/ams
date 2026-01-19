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

    const departments = await prisma.fileDepartment.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        _count: {
          select: { 
            knowledgeFiles: true,
            fileTypes: true
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error("Error fetching file departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch file departments" },
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

    // Check for KNOWLEDGE_BASE WRITE or ALL permission
    const hasPermissionResult = await checkPermission(session.user.id, "KNOWLEDGE_BASE", "WRITE");
    if (!hasPermissionResult) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, isActive, sortOrder } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if department already exists
    const existing = await prisma.fileDepartment.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A department with this name already exists" },
        { status: 400 }
      );
    }

    const department = await prisma.fileDepartment.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: isActive !== false,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json({
      message: "File department created successfully",
      department,
    });
  } catch (error) {
    console.error("Error creating file department:", error);
    return NextResponse.json(
      { error: "Failed to create file department" },
      { status: 500 }
    );
  }
}
