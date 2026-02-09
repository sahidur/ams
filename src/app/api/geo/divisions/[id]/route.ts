import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkPermission } from "@/lib/permissions";

// GET division by ID
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
    const division = await prisma.division.findUnique({
      where: { id },
      include: { districts: true },
    });

    if (!division) {
      return NextResponse.json({ error: "Division not found" }, { status: 404 });
    }

    return NextResponse.json(division);
  } catch (error) {
    console.error("Error fetching division:", error);
    return NextResponse.json({ error: "Failed to fetch division" }, { status: 500 });
  }
}

// PATCH update division status
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

    const division = await prisma.division.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json(division);
  } catch (error) {
    console.error("Error updating division:", error);
    return NextResponse.json({ error: "Failed to update division" }, { status: 500 });
  }
}

// DELETE division
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

    // Check for child districts before deleting
    const districtCount = await prisma.district.count({ where: { divisionId: id } });
    if (districtCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${districtCount} district(s) exist under this division. Remove them first.` },
        { status: 400 }
      );
    }

    await prisma.division.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting division:", error);
    return NextResponse.json({ error: "Failed to delete division" }, { status: 500 });
  }
}
