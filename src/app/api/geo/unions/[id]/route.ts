import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkPermission } from "@/lib/permissions";

// GET union by ID
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
    const union = await prisma.union.findUnique({
      where: { id },
      include: { upazila: { include: { district: { include: { division: true } } } } },
    });

    if (!union) {
      return NextResponse.json({ error: "Union not found" }, { status: 404 });
    }

    return NextResponse.json(union);
  } catch (error) {
    console.error("Error fetching union:", error);
    return NextResponse.json({ error: "Failed to fetch union" }, { status: 500 });
  }
}

// PATCH update union status
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

    const union = await prisma.union.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json(union);
  } catch (error) {
    console.error("Error updating union:", error);
    return NextResponse.json({ error: "Failed to update union" }, { status: 500 });
  }
}

// DELETE union
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
    await prisma.union.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting union:", error);
    return NextResponse.json({ error: "Failed to delete union" }, { status: 500 });
  }
}
