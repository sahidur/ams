import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const cohortSchema = z.object({
  cohortId: z.string().min(1, "Cohort ID is required"),
  name: z.string().min(1, "Cohort name is required"),
  projectId: z.string().min(1, "Project ID is required"),
  duration: z.coerce.number().optional(),
  learnerTarget: z.coerce.number().optional(),
  jobPlacementTarget: z.coerce.number().optional(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const cohorts = await prisma.cohort.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        project: {
          select: {
            id: true,
            name: true,
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

    if (session.user.role !== "ADMIN") {
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
        description: validatedData.description,
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
