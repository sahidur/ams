import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Fetch login logs for a user
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Check if user is viewing their own logs or has admin access
    const isOwnProfile = session.user.id === id;
    
    // Get current user's role permissions
    let hasAdminAccess = false;
    if (!isOwnProfile && session.user.userRoleId) {
      const userRole = await prisma.userRole.findUnique({
        where: { id: session.user.userRoleId },
        include: {
          permissions: {
            where: { module: "USERS" },
          },
        },
      });
      
      hasAdminAccess = userRole?.isSystem || 
        userRole?.permissions.some(p => 
          p.actions.includes("ALL") || p.actions.includes("READ")
        ) || false;
    }

    if (!isOwnProfile && !hasAdminAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.loginLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.loginLog.count({ where: { userId: id } }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching login logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch login logs" },
      { status: 500 }
    );
  }
}
