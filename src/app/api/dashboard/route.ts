import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const cohortId = searchParams.get("cohortId");
    const modelTypeId = searchParams.get("modelTypeId");
    const trainingTypeId = searchParams.get("trainingTypeId");

    // Build filters for branch query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const branchFilter: any = { isActive: true };
    if (cohortId) {
      branchFilter.cohortId = cohortId;
    } else if (projectId) {
      branchFilter.cohort = { projectId };
    }
    if (modelTypeId || trainingTypeId) {
      branchFilter.cohort = {
        ...branchFilter.cohort,
        project: {
          ...(modelTypeId && { modelTypeId }),
          ...(trainingTypeId && { trainingTypeId }),
        }
      };
    }

    // Fetch all stats in parallel
    const [
      totalUsers,
      activeProjects,
      totalBranches,
      totalBatches,
      classesToday,
      recentActivities,
      branchLocations,
      attendanceStats
    ] = await Promise.all([
      // Total users
      prisma.user.count({ where: { isActive: true } }),
      
      // Active projects
      prisma.project.count({ where: { isActive: true } }),
      
      // Total branches
      prisma.branch.count({ where: branchFilter }),
      
      // Total batches
      prisma.batch.count({
        where: cohortId ? { branch: { cohortId } } : projectId ? { branch: { cohort: { projectId } } } : undefined
      }),
      
      // Classes today (classes where today falls between startDate and endDate)
      prisma.class.count({
        where: {
          startDate: {
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
          endDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          }
        }
      }),
      
      // Recent activities (using class and attendance as proxy)
      prisma.class.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          batch: {
            include: {
              branch: { select: { branchName: true } },
              trainer: { select: { name: true } },
            }
          }
        }
      }),
      
      // Branch locations for map
      prisma.branch.findMany({
        where: branchFilter,
        select: {
          id: true,
          branchName: true,
          branchCode: true,
          division: true,
          district: true,
          upazila: true,
          union: true,
          isActive: true,
          cohort: {
            select: {
              id: true,
              name: true,
              cohortId: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  modelType: { select: { id: true, name: true } },
                  trainingType: { select: { id: true, name: true } },
                }
              }
            }
          },
          _count: {
            select: { batches: true }
          }
        }
      }),
      
      // Attendance stats (last 7 days)
      prisma.attendance.groupBy({
        by: ["isPresent"],
        _count: { isPresent: true },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Calculate attendance rate
    const presentCount = attendanceStats.find(s => s.isPresent === true)?._count.isPresent || 0;
    const totalAttendance = attendanceStats.reduce((sum, s) => sum + s._count.isPresent, 0);
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    // Format recent activities
    const formattedActivities = recentActivities.map(c => ({
      id: c.id,
      action: `Class "${c.name}" scheduled`,
      details: `${c.batch.branch.branchName} - ${c.batch.trainer?.name || "No trainer"}`,
      time: formatTimeAgo(c.createdAt),
      type: "class"
    }));

    // Group branches by district for map
    const branchByDistrict = branchLocations.reduce((acc, branch) => {
      const key = branch.district;
      if (!acc[key]) {
        acc[key] = {
          district: branch.district,
          division: branch.division,
          branches: [],
          count: 0
        };
      }
      acc[key].branches.push(branch);
      acc[key].count++;
      return acc;
    }, {} as Record<string, { district: string; division: string; branches: typeof branchLocations; count: number }>);

    return NextResponse.json({
      stats: {
        totalUsers,
        activeProjects,
        totalBranches,
        totalBatches,
        classesToday,
        attendanceRate: `${attendanceRate}%`
      },
      recentActivities: formattedActivities,
      branchLocations,
      branchByDistrict: Object.values(branchByDistrict),
      filters: {
        projectId,
        cohortId,
        modelTypeId,
        trainingTypeId
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}
