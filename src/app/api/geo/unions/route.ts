import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all unions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const upazilaId = searchParams.get("upazilaId");

    const where = upazilaId ? { upazilaId } : {};
    
    const unions = await prisma.union.findMany({
      where,
      orderBy: { name: "asc" },
      include: { upazila: { select: { name: true, district: { select: { name: true } } } } },
    });
    return NextResponse.json(unions);
  } catch (error) {
    console.error("Error fetching unions:", error);
    return NextResponse.json({ error: "Failed to fetch unions" }, { status: 500 });
  }
}

// POST create union
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, bnName, parentId } = body;

    if (!name || !parentId) {
      return NextResponse.json({ error: "Name and upazila are required" }, { status: 400 });
    }

    // Generate geoId
    const lastUnion = await prisma.union.findFirst({
      orderBy: { geoId: "desc" },
    });
    const newGeoId = lastUnion 
      ? String(parseInt(lastUnion.geoId) + 1)
      : "10000";

    const union = await prisma.union.create({
      data: {
        geoId: newGeoId,
        upazilaId: parentId,
        name,
        bnName: bnName || null,
      },
    });

    return NextResponse.json(union, { status: 201 });
  } catch (error) {
    console.error("Error creating union:", error);
    return NextResponse.json({ error: "Failed to create union" }, { status: 500 });
  }
}

// PUT update union
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, bnName, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const union = await prisma.union.update({
      where: { id },
      data: {
        name,
        bnName,
        isActive,
      },
    });

    return NextResponse.json(union);
  } catch (error) {
    console.error("Error updating union:", error);
    return NextResponse.json({ error: "Failed to update union" }, { status: 500 });
  }
}
