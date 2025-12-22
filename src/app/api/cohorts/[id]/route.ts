import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const cohortUpdateSchema = z.object({
  cohortId: z.string().min(1, "Cohort ID is required"),
  name: z.string().min(1, "Cohort name is required"),
  projectId: z.string().optional(),
  duration: z.coerce.number().optional(),
  learnerTarget: z.coerce.number().optional(),
  jobPlacementTarget: z.coerce.number().optional(),
  description: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const cohort = await prisma.cohort.findUnique({
      where: { id },
      include: {
        project: true,
        batches: true,
        branches: {
          include: {
            branch: true,
          },
        },
      },
    });

    if (!cohort) {
      return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
    }

    return NextResponse.json(cohort);
  } catch (error) {
    console.error("Error fetching cohort:", error);
    return NextResponse.json(
      { error: "Failed to fetch cohort" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = cohortUpdateSchema.parse(body);

    // Check if cohortId is being changed and if it already exists
    const existingCohort = await prisma.cohort.findUnique({
      where: { id },
    });

    if (!existingCohort) {
      return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
    }

    if (validatedData.cohortId !== existingCohort.cohortId) {
      const duplicateCohort = await prisma.cohort.findUnique({
        where: { cohortId: validatedData.cohortId },
      });
      if (duplicateCohort) {
        return NextResponse.json(
          { error: "Cohort ID already exists" },
          { status: 400 }
        );
      }
    }

    const cohort = await prisma.cohort.update({
      where: { id },
      data: {
        cohortId: validatedData.cohortId,
        name: validatedData.name,
        duration: validatedData.duration,
        learnerTarget: validatedData.learnerTarget,
        jobPlacementTarget: validatedData.jobPlacementTarget,
        description: validatedData.description,
      },
    });

    return NextResponse.json(cohort);
  } catch (error) {
    console.error("Error updating cohort:", error);
    return NextResponse.json(
      { error: "Failed to update cohort" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.cohort.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting cohort:", error);
    return NextResponse.json(
      { error: "Failed to delete cohort" },
      { status: 500 }
    );
  }
}
