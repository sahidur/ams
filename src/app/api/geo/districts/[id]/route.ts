import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET district by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id } = await params;
    await prisma.district.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting district:", error);
    return NextResponse.json({ error: "Failed to delete district" }, { status: 500 });
  }
}
