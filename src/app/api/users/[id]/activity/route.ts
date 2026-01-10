import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET /api/users/[id]/activity - Get activity logs for a user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Users can view their own activity, admins can view any
    const isOwnProfile = session.user.id === id;
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { userRole: true },
    });
    const isSuperAdmin = currentUser?.userRole?.name === "SUPER_ADMIN";
    
    if (!isOwnProfile && !isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const category = searchParams.get("category");

    const whereClause: { userId: string; category?: string } = { userId: id };
    if (category) {
      whereClause.category = category;
    }

    const [logs, total] = await Promise.all([
      prisma.userActivityLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          editor: {
            select: {
              id: true,
              name: true,
              profileImage: true,
              userRole: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      }),
      prisma.userActivityLog.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      logs,
      total,
      hasMore: offset + logs.length < total,
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}
