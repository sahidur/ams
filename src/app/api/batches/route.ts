import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { batchSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where: Record<string, unknown> = {};

    // If trainer, only show their batches
    if (session.user.role === "TRAINER") {
      where.trainerId = session.user.id;
    }

    const batches = await prisma.batch.findMany({
      where,
      include: {
        branch: {
          select: {
            id: true,
            branchName: true,
            upazila: true,
            district: true,
          },
        },
        cohort: {
          select: {
            id: true,
            name: true,
          },
        },
        trainer: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            students: true,
            classes: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(batches);
  } catch (error) {
    console.error("Error fetching batches:", error);
    return NextResponse.json(
      { error: "Failed to fetch batches" },
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

    if (!["ADMIN", "TRAINER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = batchSchema.parse(body);

    const batch = await prisma.batch.create({
      data: {
        name: validatedData.name,
        branchId: validatedData.branchId,
        cohortId: validatedData.cohortId || undefined,
        trainerId: validatedData.trainerId || undefined,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
      },
      include: {
        branch: true,
        cohort: true,
        trainer: true,
      },
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    console.error("Error creating batch:", error);
    return NextResponse.json(
      { error: "Failed to create batch" },
      { status: 500 }
    );
  }
}
