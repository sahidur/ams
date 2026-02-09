import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkPermission } from "@/lib/permissions";

// GET all divisions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where = activeOnly ? { isActive: true } : {};
    
    const divisions = await prisma.division.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { districts: true } }
      },
    });
    return NextResponse.json(divisions);
  } catch (error) {
    console.error("Error fetching divisions:", error);
    return NextResponse.json({ error: "Failed to fetch divisions" }, { status: 500 });
  }
}

// POST create division
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasWritePermission = await checkPermission(session.user.id, "GEO_ADMIN", "WRITE");
    if (!hasWritePermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, bnName } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate geoId
    const lastDivision = await prisma.division.findFirst({
      orderBy: { geoId: "desc" },
    });
    const newGeoId = lastDivision 
      ? String(parseInt(lastDivision.geoId) + 1)
      : "100";

    const division = await prisma.division.create({
      data: {
        geoId: newGeoId,
        name,
        bnName: bnName || null,
      },
    });

    return NextResponse.json(division, { status: 201 });
  } catch (error) {
    console.error("Error creating division:", error);
    return NextResponse.json({ error: "Failed to create division" }, { status: 500 });
  }
}

// PUT update division
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasWritePermission = await checkPermission(session.user.id, "GEO_ADMIN", "WRITE");
    if (!hasWritePermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, bnName, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const division = await prisma.division.update({
      where: { id },
      data: {
        name,
        bnName,
        isActive,
      },
    });

    return NextResponse.json(division);
  } catch (error) {
    console.error("Error updating division:", error);
    return NextResponse.json({ error: "Failed to update division" }, { status: 500 });
  }
}
