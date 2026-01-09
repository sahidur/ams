import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkPermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const types = await prisma.employmentType.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(types);
  } catch (error) {
    console.error("Error fetching employment types:", error);
    return NextResponse.json(
      { error: "Failed to fetch employment types" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canWrite = await checkPermission(session.user.id, "USERS", "WRITE");
    if (!canWrite) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Employment type name is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.employmentType.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Employment type already exists" },
        { status: 400 }
      );
    }

    const type = await prisma.employmentType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json(type, { status: 201 });
  } catch (error) {
    console.error("Error creating employment type:", error);
    return NextResponse.json(
      { error: "Failed to create employment type" },
      { status: 500 }
    );
  }
}
