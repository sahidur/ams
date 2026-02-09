import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkPermission } from "@/lib/permissions";

// GET upazila by ID
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
    const upazila = await prisma.upazila.findUnique({
      where: { id },
      include: { district: { include: { division: true } }, unions: true },
    });

    if (!upazila) {
      return NextResponse.json({ error: "Upazila not found" }, { status: 404 });
    }

    return NextResponse.json(upazila);
  } catch (error) {
    console.error("Error fetching upazila:", error);
    return NextResponse.json({ error: "Failed to fetch upazila" }, { status: 500 });
  }
}

// PATCH update upazila status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasWritePermission = await checkPermission(session.user.id, "GEO_ADMIN", "WRITE");
    if (!hasWritePermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;

    const upazila = await prisma.upazila.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json(upazila);
  } catch (error) {
    console.error("Error updating upazila:", error);
    return NextResponse.json({ error: "Failed to update upazila" }, { status: 500 });
  }
}

// DELETE upazila
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasDeletePermission = await checkPermission(session.user.id, "GEO_ADMIN", "DELETE");
    if (!hasDeletePermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check for child unions before deleting
    const unionCount = await prisma.union.count({ where: { upazilaId: id } });
    if (unionCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${unionCount} union(s) exist under this upazila. Remove them first.` },
        { status: 400 }
      );
    }

    await prisma.upazila.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting upazila:", error);
    return NextResponse.json({ error: "Failed to delete upazila" }, { status: 500 });
  }
}
