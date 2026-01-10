import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// Get fingerprint status for multiple students
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");

    if (!idsParam) {
      return NextResponse.json({ error: "Student IDs required" }, { status: 400 });
    }

    const studentIds = idsParam.split(",").filter(Boolean);

    if (studentIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get fingerprint credentials for the specified students
    const credentials = await prisma.fingerprintCredential.findMany({
      where: {
        userId: {
          in: studentIds,
        },
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });

    return NextResponse.json(credentials);
  } catch (error) {
    console.error("Error fetching fingerprint status:", error);
    return NextResponse.json(
      { error: "Failed to fetch fingerprint status" },
      { status: 500 }
    );
  }
}
