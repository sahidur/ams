import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all districts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const divisionId = searchParams.get("divisionId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: { divisionId?: string; isActive?: boolean } = {};
    if (divisionId) where.divisionId = divisionId;
    if (activeOnly) where.isActive = true;
    
    const districts = await prisma.district.findMany({
      where,
      orderBy: { name: "asc" },
      include: { 
        division: { select: { id: true, name: true } },
        _count: { select: { upazilas: true } },
      },
    });
    return NextResponse.json(districts);
  } catch (error) {
    console.error("Error fetching districts:", error);
    return NextResponse.json({ error: "Failed to fetch districts" }, { status: 500 });
  }
}

// POST create district
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, bnName, divisionId, parentId } = body;
    const actualDivisionId = divisionId || parentId;

    if (!name || !actualDivisionId) {
      return NextResponse.json({ error: "Name and division are required" }, { status: 400 });
    }

    // Generate geoId
    const lastDistrict = await prisma.district.findFirst({
      orderBy: { geoId: "desc" },
    });
    const newGeoId = lastDistrict 
      ? String(parseInt(lastDistrict.geoId) + 1)
      : "100";

    const district = await prisma.district.create({
      data: {
        geoId: newGeoId,
        divisionId: actualDivisionId,
        name,
        bnName: bnName || null,
      },
    });

    return NextResponse.json(district, { status: 201 });
  } catch (error) {
    console.error("Error creating district:", error);
    return NextResponse.json({ error: "Failed to create district" }, { status: 500 });
  }
}

// PUT update district
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, bnName, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const district = await prisma.district.update({
      where: { id },
      data: {
        name,
        bnName,
        isActive,
      },
    });

    return NextResponse.json(district);
  } catch (error) {
    console.error("Error updating district:", error);
    return NextResponse.json({ error: "Failed to update district" }, { status: 500 });
  }
}
