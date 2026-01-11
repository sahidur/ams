import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET single approval template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const template = await prisma.approvalTemplate.findUnique({
      where: { id },
      include: {
        formFields: {
          orderBy: { sortOrder: "asc" },
        },
        levels: {
          orderBy: { levelNumber: "asc" },
          include: {
            approvers: {
              include: {
                user: { select: { id: true, name: true, email: true } },
                userRole: { select: { id: true, displayName: true } },
              },
              orderBy: { sortOrder: "asc" },
            },
            project: { select: { id: true, name: true } },
            cohort: { select: { id: true, name: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { requests: true } },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching approval template:", error);
    return NextResponse.json(
      { error: "Failed to fetch approval template" },
      { status: 500 }
    );
  }
}

// PUT update approval template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, displayName, description, icon, color, defaultSlaHours, isActive } = body;

    const existing = await prisma.approvalTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Check for duplicate name if changed
    if (name && name !== existing.name) {
      const duplicate = await prisma.approvalTemplate.findUnique({
        where: { name },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "An approval template with this name already exists" },
          { status: 400 }
        );
      }
    }

    const template = await prisma.approvalTemplate.update({
      where: { id },
      data: {
        name,
        displayName,
        description,
        icon,
        color,
        defaultSlaHours,
        isActive,
      },
      include: {
        formFields: { orderBy: { sortOrder: "asc" } },
        levels: {
          orderBy: { levelNumber: "asc" },
          include: { approvers: true },
        },
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error updating approval template:", error);
    return NextResponse.json(
      { error: "Failed to update approval template" },
      { status: 500 }
    );
  }
}

// DELETE approval template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if template has requests
    const requestCount = await prisma.approvalRequest.count({
      where: { templateId: id },
    });

    if (requestCount > 0) {
      // Soft delete - just deactivate
      await prisma.approvalTemplate.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ message: "Template deactivated (has existing requests)" });
    }

    // Hard delete if no requests
    await prisma.approvalTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting approval template:", error);
    return NextResponse.json(
      { error: "Failed to delete approval template" },
      { status: 500 }
    );
  }
}
