import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkPermission } from "@/lib/permissions";

const cohortSchema = z.object({
  cohortId: z.string().min(1, "Cohort ID is required"),
  name: z.string().min(1, "Cohort name is required"),
  projectId: z.string().min(1, "Project ID is required"),
  duration: z.coerce.number().optional(),
  learnerTarget: z.coerce.number().optional(),
  jobPlacementTarget: z.coerce.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().optional(),
  description: z.string().optional(),
  focalPersonId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const whereClause: { projectId?: string; isActive?: boolean } = {};
    if (projectId) {
      whereClause.projectId = projectId;
    }
    if (activeOnly) {
      whereClause.isActive = true;
    }

    const cohorts = await prisma.cohort.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        focalPerson: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            batches: true,
            branches: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(cohorts);
  } catch (error) {
    console.error("Error fetching cohorts:", error);
    return NextResponse.json(
      { error: "Failed to fetch cohorts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check WRITE permission on PROJECTS module (cohorts are part of projects)
    const canWriteProjects = await checkPermission(session.user.id, "PROJECTS", "WRITE");
    if (!canWriteProjects) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = cohortSchema.parse(body);

    // Check if cohortId already exists
    const existingCohort = await prisma.cohort.findUnique({
      where: { cohortId: validatedData.cohortId },
    });

    if (existingCohort) {
      return NextResponse.json(
        { error: "Cohort ID already exists" },
        { status: 400 }
      );
    }

    const cohort = await prisma.cohort.create({
      data: {
        cohortId: validatedData.cohortId,
        name: validatedData.name,
        projectId: validatedData.projectId,
        duration: validatedData.duration,
        learnerTarget: validatedData.learnerTarget,
        jobPlacementTarget: validatedData.jobPlacementTarget,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
        isActive: validatedData.isActive ?? true,
        description: validatedData.description,
        focalPersonId: validatedData.focalPersonId || null,
      },
      include: {
        project: true,
      },
    });

    return NextResponse.json(cohort, { status: 201 });
  } catch (error) {
    console.error("Error creating cohort:", error);
    return NextResponse.json(
      { error: "Failed to create cohort" },
      { status: 500 }
    );
  }
}
