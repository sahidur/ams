import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get("cohortId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const whereClause: { cohortId?: string; isActive?: boolean } = {};
    if (cohortId) {
      whereClause.cohortId = cohortId;
    }
    if (activeOnly) {
      whereClause.isActive = true;
    }

    const branches = await prisma.branch.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        cohort: {
          select: {
            id: true,
            cohortId: true,
            name: true,
            isActive: true,
            project: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: [
        { division: "asc" },
        { district: "asc" },
        { branchName: "asc" },
      ],
    });

    return NextResponse.json(branches);
  } catch (error) {
    console.error("Error fetching branches:", error);
    return NextResponse.json(
      { error: "Failed to fetch branches" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !["ADMIN", "HO_USER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { division, district, upazila, branchName, branchCode, cohortId } = body;

    // If cohortId is provided, validate it exists and is active
    if (cohortId) {
      const cohort = await prisma.cohort.findUnique({
        where: { id: cohortId },
        include: {
          project: {
            select: { isActive: true },
          },
        },
      });

      if (!cohort) {
        return NextResponse.json({ error: "Cohort not found" }, { status: 400 });
      }

      if (!cohort.isActive) {
        return NextResponse.json({ error: "Cohort is not active" }, { status: 400 });
      }

      if (!cohort.project.isActive) {
        return NextResponse.json({ error: "Project is not active" }, { status: 400 });
      }
    }

    const branch = await prisma.branch.create({
      data: {
        division,
        district,
        upazila,
        branchName,
        branchCode: branchCode || null,
        cohortId: cohortId || null,
      },
      include: {
        cohort: {
          select: {
            id: true,
            cohortId: true,
            name: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: "Branch created successfully",
      branch,
    });
  } catch (error) {
    console.error("Error creating branch:", error);
    return NextResponse.json(
      { error: "Failed to create branch" },
      { status: 500 }
    );
  }
}
