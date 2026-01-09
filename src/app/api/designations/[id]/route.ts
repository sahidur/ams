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

    const designation = await prisma.designation.findUnique({
      where: { id },
    });

    if (!designation) {
      return NextResponse.json({ error: "Designation not found" }, { status: 404 });
    }

    return NextResponse.json(designation);
  } catch (error) {
    console.error("Error fetching designation:", error);
    return NextResponse.json(
      { error: "Failed to fetch designation" },
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
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canWrite = await checkPermission(session.user.id, "USERS", "WRITE");
    if (!canWrite) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, isActive } = body;

    const existing = await prisma.designation.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Designation not found" }, { status: 404 });
    }

    // Check for duplicate name
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.designation.findUnique({
        where: { name: name.trim() },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Designation name already exists" },
          { status: 400 }
        );
      }
    }

    const designation = await prisma.designation.update({
      where: { id },
      data: {
        name: name?.trim() || existing.name,
        description: description !== undefined ? description?.trim() || null : existing.description,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    return NextResponse.json(designation);
  } catch (error) {
    console.error("Error updating designation:", error);
    return NextResponse.json(
      { error: "Failed to update designation" },
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

    const canDelete = await checkPermission(session.user.id, "USERS", "DELETE");
    if (!canDelete) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if designation is in use
    const usersWithDesignation = await prisma.user.count({
      where: { designationId: id },
    });

    if (usersWithDesignation > 0) {
      return NextResponse.json(
        { error: `Cannot delete. ${usersWithDesignation} users are using this designation. Deactivate instead.` },
        { status: 400 }
      );
    }

    await prisma.designation.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Designation deleted successfully" });
  } catch (error) {
    console.error("Error deleting designation:", error);
    return NextResponse.json(
      { error: "Failed to delete designation" },
      { status: 500 }
    );
  }
}
