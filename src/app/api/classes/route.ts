import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { classSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where: Record<string, unknown> = {};

    // If trainer, only show their classes
    if (session.user.role === "TRAINER") {
      where.batch = {
        trainerId: session.user.id,
      };
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        batch: {
          include: {
            trainer: {
              select: {
                id: true,
                name: true,
              },
            },
            students: {
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            attendances: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    // Transform _count.attendances to _count.attendance for frontend compatibility
    const transformedClasses = classes.map(c => ({
      ...c,
      _count: {
        attendance: c._count.attendances,
      },
    }));

    return NextResponse.json(transformedClasses);
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json(
      { error: "Failed to fetch classes" },
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

    // Only trainers and admins can create classes
    if (!["ADMIN", "TRAINER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = classSchema.parse(body);

    const classData = await prisma.class.create({
      data: {
        name: validatedData.name,
        subject: validatedData.subject,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        batchId: validatedData.batchId,
      },
      include: {
        batch: {
          include: {
            trainer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(classData, { status: 201 });
  } catch (error) {
    console.error("Error creating class:", error);
    return NextResponse.json(
      { error: "Failed to create class" },
      { status: 500 }
    );
  }
}
