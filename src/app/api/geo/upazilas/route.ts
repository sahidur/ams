import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all upazilas
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const districtId = searchParams.get("districtId");

    const where = districtId ? { districtId } : {};
    
    const upazilas = await prisma.upazila.findMany({
      where,
      orderBy: { name: "asc" },
      include: { district: { select: { name: true, division: { select: { name: true } } } } },
    });
    return NextResponse.json(upazilas);
  } catch (error) {
    console.error("Error fetching upazilas:", error);
    return NextResponse.json({ error: "Failed to fetch upazilas" }, { status: 500 });
  }
}

// POST create upazila
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, bnName, parentId } = body;

    if (!name || !parentId) {
      return NextResponse.json({ error: "Name and district are required" }, { status: 400 });
    }

    // Generate geoId
    const lastUpazila = await prisma.upazila.findFirst({
      orderBy: { geoId: "desc" },
    });
    const newGeoId = lastUpazila 
      ? String(parseInt(lastUpazila.geoId) + 1)
      : "1000";

    const upazila = await prisma.upazila.create({
      data: {
        geoId: newGeoId,
        districtId: parentId,
        name,
        bnName: bnName || null,
      },
    });

    return NextResponse.json(upazila, { status: 201 });
  } catch (error) {
    console.error("Error creating upazila:", error);
    return NextResponse.json({ error: "Failed to create upazila" }, { status: 500 });
  }
}

// PUT update upazila
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, bnName, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const upazila = await prisma.upazila.update({
      where: { id },
      data: {
        name,
        bnName,
        isActive,
      },
    });

    return NextResponse.json(upazila);
  } catch (error) {
    console.error("Error updating upazila:", error);
    return NextResponse.json({ error: "Failed to update upazila" }, { status: 500 });
  }
}
