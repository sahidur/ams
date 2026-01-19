import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isSuperAdmin } from "@/lib/permissions";

// GET - Fetch deleted files (recycle bin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super admin can view recycle bin
    const isSuper = await isSuperAdmin(session.user.id);
    if (!isSuper) {
      return NextResponse.json({ error: "Access denied. Super Admin only." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [files, totalCount] = await Promise.all([
      prisma.knowledgeFile.findMany({
        where: { isDeleted: true },
        include: {
          department: { select: { id: true, name: true } },
          fileType: { select: { id: true, name: true } },
          uploadedBy: { select: { id: true, name: true, email: true } },
          deletedBy: { select: { id: true, name: true, email: true } },
          projects: {
            include: {
              project: { select: { id: true, name: true } },
            },
          },
          cohorts: {
            include: {
              cohort: { select: { id: true, cohortId: true, name: true } },
            },
          },
        },
        orderBy: { deletedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.knowledgeFile.count({ where: { isDeleted: true } }),
    ]);

    // Transform the response
    const transformedFiles = files.map((file) => ({
      ...file,
      projects: file.projects.map((p) => p.project),
      cohorts: file.cohorts.map((c) => c.cohort),
    }));

    return NextResponse.json({
      files: transformedFiles,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching recycle bin:", error);
    return NextResponse.json(
      { error: "Failed to fetch recycle bin" },
      { status: 500 }
    );
  }
}
