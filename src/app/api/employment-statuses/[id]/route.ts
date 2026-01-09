import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkPermission } from "@/lib/permissions";

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

    const existing = await prisma.employmentStatus.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Employment status not found" }, { status: 404 });
    }

    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.employmentStatus.findUnique({
        where: { name: name.trim() },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Employment status name already exists" },
          { status: 400 }
        );
      }
    }

    const status = await prisma.employmentStatus.update({
      where: { id },
      data: {
        name: name?.trim() || existing.name,
        description: description !== undefined ? description?.trim() || null : existing.description,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error updating employment status:", error);
    return NextResponse.json(
      { error: "Failed to update employment status" },
      { status: 500 }
    );
  }
}
