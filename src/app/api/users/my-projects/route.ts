import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// Roles that can see all projects regardless of assignments
const UNRESTRICTED_ROLES = ["Super Admin", "HO Management"];

// GET user's assigned projects and cohorts
// Super Admin and HO Management see all active projects
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const userRoleName = session.user.userRoleName || "";
    const isUnrestricted = UNRESTRICTED_ROLES.includes(userRoleName);

    if (isUnrestricted) {
      // Super Admin and HO Management see all projects
      const projects = await prisma.project.findMany({
        where: activeOnly ? { isActive: true } : {},
        include: {
          cohorts: {
            where: activeOnly ? { isActive: true } : {},
            select: {
              id: true,
              cohortId: true,
              name: true,
              isActive: true,
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      });

      return NextResponse.json({
        isUnrestricted: true,
        projects,
      });
    }

    // Regular users: fetch only assigned projects/cohorts
    const assignments = await prisma.userProjectAssignment.findMany({
      where: { userId: session.user.id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        cohort: {
          select: {
            id: true,
            cohortId: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    // Group by project
    const projectMap = new Map<string, {
      id: string;
      name: string;
      isActive: boolean;
      cohorts: { id: string; cohortId: string; name: string; isActive: boolean }[];
    }>();

    for (const assignment of assignments) {
      // Skip inactive if activeOnly
      if (activeOnly && !assignment.project.isActive) continue;
      if (activeOnly && !assignment.cohort.isActive) continue;

      if (!projectMap.has(assignment.project.id)) {
        projectMap.set(assignment.project.id, {
          ...assignment.project,
          cohorts: [],
        });
      }

      const project = projectMap.get(assignment.project.id)!;
      // Avoid duplicate cohorts
      if (!project.cohorts.find(c => c.id === assignment.cohort.id)) {
        project.cohorts.push(assignment.cohort);
      }
    }

    // Sort cohorts within each project
    for (const project of projectMap.values()) {
      project.cohorts.sort((a, b) => a.name.localeCompare(b.name));
    }

    const projects = Array.from(projectMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    return NextResponse.json({
      isUnrestricted: false,
      projects,
    });
  } catch (error) {
    console.error("Error fetching user projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
