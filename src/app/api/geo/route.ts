import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all geo data - divisions, districts, upazilas, unions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type"); // divisions, districts, upazilas, unions
    const divisionId = searchParams.get("divisionId");
    const districtId = searchParams.get("districtId");
    const upazilaId = searchParams.get("upazilaId");

    if (type === "divisions") {
      const divisions = await prisma.division.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(divisions);
    }

    if (type === "districts") {
      const where: { isActive: boolean; divisionId?: string } = { isActive: true };
      if (divisionId) {
        where.divisionId = divisionId;
      }
      const districts = await prisma.district.findMany({
        where,
        orderBy: { name: "asc" },
        include: { division: { select: { name: true } } },
      });
      return NextResponse.json(districts);
    }

    if (type === "upazilas") {
      const where: { isActive: boolean; districtId?: string } = { isActive: true };
      if (districtId) {
        where.districtId = districtId;
      }
      const upazilas = await prisma.upazila.findMany({
        where,
        orderBy: { name: "asc" },
        include: { district: { select: { name: true, division: { select: { name: true } } } } },
      });
      return NextResponse.json(upazilas);
    }

    if (type === "unions") {
      const where: { isActive: boolean; upazilaId?: string } = { isActive: true };
      if (upazilaId) {
        where.upazilaId = upazilaId;
      }
      const unions = await prisma.union.findMany({
        where,
        orderBy: { name: "asc" },
        include: { upazila: { select: { name: true } } },
      });
      return NextResponse.json(unions);
    }

    // Return all hierarchical data
    const divisions = await prisma.division.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        districts: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          include: {
            upazilas: {
              where: { isActive: true },
              orderBy: { name: "asc" },
              include: {
                unions: {
                  where: { isActive: true },
                  orderBy: { name: "asc" },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(divisions);
  } catch (error) {
    console.error("Error fetching geo data:", error);
    return NextResponse.json({ error: "Failed to fetch geo data" }, { status: 500 });
  }
}
