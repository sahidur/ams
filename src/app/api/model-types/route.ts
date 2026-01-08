import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET all project model types
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const activeOnly = searchParams.get("activeOnly") === "true";

    const modelTypes = await prisma.projectModelType.findMany({
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

    return NextResponse.json(modelTypes);
  } catch (error) {
    console.error("Error fetching model types:", error);
    return NextResponse.json(
      { error: "Failed to fetch model types" },
      { status: 500 }
    );
  }
}

// POST create new project model type
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
        { error: "Model type name is required" },
        { status: 400 }
      );
    }

    // Check if name already exists
    const existing = await prisma.projectModelType.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A model type with this name already exists" },
        { status: 400 }
      );
    }

    const modelType = await prisma.projectModelType.create({
      data: {
        name: name.trim(),
        description: description || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        isActive: true,
      },
    });

    return NextResponse.json(modelType, { status: 201 });
  } catch (error) {
    console.error("Error creating model type:", error);
    return NextResponse.json(
      { error: "Failed to create model type" },
      { status: 500 }
    );
  }
}
