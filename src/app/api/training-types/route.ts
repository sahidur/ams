import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET all training types
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const activeOnly = searchParams.get("activeOnly") === "true";

    const trainingTypes = await prisma.trainingType.findMany({
      where: {
        AND: [
          search ? {
            name: { contains: search, mode: "insensitive" },
          } : {},
          activeOnly ? { isActive: true } : {},
        ],
      },
      include: {
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(trainingTypes);
  } catch (error) {
    console.error("Error fetching training types:", error);
    return NextResponse.json(
      { error: "Failed to fetch training types" },
      { status: 500 }
    );
  }
}

// POST create new training type
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, startDate } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Training type name is required" },
        { status: 400 }
      );
    }

    // Check if name already exists
    const existing = await prisma.trainingType.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A training type with this name already exists" },
        { status: 400 }
      );
    }

    const trainingType = await prisma.trainingType.create({
      data: {
        name: name.trim(),
        description: description || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        isActive: true,
      },
    });

    return NextResponse.json(trainingType, { status: 201 });
  } catch (error) {
    console.error("Error creating training type:", error);
    return NextResponse.json(
      { error: "Failed to create training type" },
      { status: 500 }
    );
  }
}
