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

    const statuses = await prisma.employmentStatus.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(statuses);
  } catch (error) {
    console.error("Error fetching employment statuses:", error);
    return NextResponse.json(
      { error: "Failed to fetch employment statuses" },
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
        { error: "Employment status name is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.employmentStatus.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Employment status already exists" },
        { status: 400 }
      );
    }

    const status = await prisma.employmentStatus.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    console.error("Error creating employment status:", error);
    return NextResponse.json(
      { error: "Failed to create employment status" },
      { status: 500 }
    );
  }
}
