import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { SYSTEM_MODULES } from "../route";

// GET all system modules or user permissions
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userPermissions = searchParams.get("userPermissions");

  // If requesting user permissions, fetch them from the database
  if (userPermissions === "true") {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ permissions: [] });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          userRole: {
            include: {
              permissions: true,
            },
          },
        },
      });

      if (!user?.userRole || !user.userRole.isActive) {
        return NextResponse.json({ permissions: [] });
      }

      // Flatten permissions - each module can have multiple actions
      const permissions: { module: string; action: string }[] = [];
      user.userRole.permissions.forEach((p) => {
        p.actions.forEach((action) => {
          permissions.push({
            module: p.module,
            action: action,
          });
        });
      });

      return NextResponse.json({ permissions });
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      return NextResponse.json({ permissions: [] });
    }
  }

  // Default: return system modules list
  return NextResponse.json(SYSTEM_MODULES);
}
