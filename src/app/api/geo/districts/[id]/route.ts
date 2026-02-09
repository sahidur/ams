import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkPermission } from "@/lib/permissions";

// GET district by ID
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
    const district = await prisma.district.findUnique({
      where: { id },
      include: { division: true, upazilas: true },
    });

    if (!district) {
      return NextResponse.json({ error: "District not found" }, { status: 404 });
    }

    return NextResponse.json(district);
  } catch (error) {
    console.error("Error fetching district:", error);
    return NextResponse.json({ error: "Failed to fetch district" }, { status: 500 });
  }
}

// PATCH update district status
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

    const district = await prisma.district.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json(district);
  } catch (error) {
    console.error("Error updating district:", error);
    return NextResponse.json({ error: "Failed to update district" }, { status: 500 });
  }
}

// DELETE district
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

    // Check for child upazilas before deleting
    const upazilaCount = await prisma.upazila.count({ where: { districtId: id } });
    if (upazilaCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${upazilaCount} upazila(s) exist under this district. Remove them first.` },
        { status: 400 }
      );
    }

    await prisma.district.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting district:", error);
    return NextResponse.json({ error: "Failed to delete district" }, { status: 500 });
  }
}
