import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import divisionsData from "../../../../../../bangladesh-geocode-1.0.0/divisions/divisions.json";
import districtsData from "../../../../../../bangladesh-geocode-1.0.0/districts/districts.json";
import upazilasData from "../../../../../../bangladesh-geocode-1.0.0/upazilas/upazilas.json";
import unionsData from "../../../../../../bangladesh-geocode-1.0.0/unions/unions.json";

interface GeoDataItem {
  id: string;
  name: string;
  bn_name: string;
  url?: string;
  division_id?: string;
  district_id?: string;
  upazilla_id?: string;
  lat?: string;
  lon?: string;
}

interface JsonData {
  type: string;
  data?: GeoDataItem[];
}

// POST - Seed geo data from JSON files
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { userRole: true },
    });

    if (!user?.userRole?.name.toLowerCase().includes("admin")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Clear existing geo data
    await prisma.union.deleteMany();
    await prisma.upazila.deleteMany();
    await prisma.district.deleteMany();
    await prisma.division.deleteMany();

    // Parse divisions
    const divisionsJson = divisionsData as JsonData[];
    const divisionsTable = divisionsJson.find(item => item.type === "table" && item.data);
    const divisions = divisionsTable?.data || [];

    // Create divisions
    const divisionMap: Record<string, string> = {};
    for (const div of divisions) {
      const division = await prisma.division.create({
        data: {
          geoId: div.id,
          name: div.name,
          bnName: div.bn_name,
          url: div.url,
        },
      });
      divisionMap[div.id] = division.id;
    }

    // Parse districts
    const districtsJson = districtsData as JsonData[];
    const districtsTable = districtsJson.find(item => item.type === "table" && item.data);
    const districts = districtsTable?.data || [];

    // Create districts
    const districtMap: Record<string, string> = {};
    for (const dist of districts) {
      if (dist.division_id && divisionMap[dist.division_id]) {
        const district = await prisma.district.create({
          data: {
            geoId: dist.id,
            divisionId: divisionMap[dist.division_id],
            name: dist.name,
            bnName: dist.bn_name,
            lat: dist.lat,
            lon: dist.lon,
            url: dist.url,
          },
        });
        districtMap[dist.id] = district.id;
      }
    }

    // Parse upazilas
    const upazilasJson = upazilasData as JsonData[];
    const upazilasTable = upazilasJson.find(item => item.type === "table" && item.data);
    const upazilas = upazilasTable?.data || [];

    // Create upazilas
    const upazilaMap: Record<string, string> = {};
    for (const upz of upazilas) {
      if (upz.district_id && districtMap[upz.district_id]) {
        const upazila = await prisma.upazila.create({
          data: {
            geoId: upz.id,
            districtId: districtMap[upz.district_id],
            name: upz.name,
            bnName: upz.bn_name,
            url: upz.url,
          },
        });
        upazilaMap[upz.id] = upazila.id;
      }
    }

    // Parse unions
    const unionsJson = unionsData as JsonData[];
    const unionsTable = unionsJson.find(item => item.type === "table" && item.data);
    const unions = unionsTable?.data || [];

    // Create unions (in batches for performance)
    let unionCount = 0;
    const batchSize = 100;
    for (let i = 0; i < unions.length; i += batchSize) {
      const batch = unions.slice(i, i + batchSize);
      const validUnions = batch.filter(
        (un) => un.upazilla_id && upazilaMap[un.upazilla_id]
      );
      
      for (const un of validUnions) {
        await prisma.union.create({
          data: {
            geoId: un.id,
            upazilaId: upazilaMap[un.upazilla_id!],
            name: un.name,
            bnName: un.bn_name,
            url: un.url,
          },
        });
        unionCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Geo data seeded successfully",
      counts: {
        divisions: divisions.length,
        districts: districts.length,
        upazilas: upazilas.length,
        unions: unionCount,
      },
    });
  } catch (error) {
    console.error("Error seeding geo data:", error);
    return NextResponse.json({ error: "Failed to seed geo data" }, { status: 500 });
  }
}
