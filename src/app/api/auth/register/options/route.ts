import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Public endpoint for getting registration options (projects and cohorts)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    // If projectId is provided, fetch cohorts for that project
    if (projectId) {
      const cohorts = await prisma.cohort.findMany({
        where: {
          projectId,
        },
        select: {
          id: true,
          cohortId: true,
          name: true,
          isActive: true,
        },
        orderBy: { name: "asc" },
      });

      return NextResponse.json({ cohorts });
    }

    // Otherwise, fetch all active projects
    const projects = await prisma.project.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Error fetching registration options:", error);
    return NextResponse.json(
      { error: "Failed to fetch options" },
      { status: 500 }
    );
  }
}
