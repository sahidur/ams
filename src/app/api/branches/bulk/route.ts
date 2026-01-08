import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

interface BulkBranchInput {
  division: string;
  district: string;
  upazila: string;
  branchName: string;
  branchCode?: string;
  projectName?: string;
  cohortName?: string;
  cohortId?: string;
}

interface ValidationError {
  row: number;
  branchName: string;
  error: string;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !["ADMIN", "HO_USER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { branches, cohortId: defaultCohortId } = body;

    if (!Array.isArray(branches) || branches.length === 0) {
      return NextResponse.json(
        { error: "No branches provided" },
        { status: 400 }
      );
    }

    // If a default cohortId is provided (e.g., when adding branches from cohort page), validate it
    let validatedDefaultCohort = null;
    if (defaultCohortId) {
      validatedDefaultCohort = await prisma.cohort.findUnique({
        where: { id: defaultCohortId },
        include: {
          project: {
            select: { isActive: true, name: true },
          },
        },
      });

      if (!validatedDefaultCohort) {
        return NextResponse.json({ error: "Default cohort not found" }, { status: 400 });
      }

      if (!validatedDefaultCohort.isActive) {
        return NextResponse.json({ error: "Default cohort is not active" }, { status: 400 });
      }

      if (!validatedDefaultCohort.project.isActive) {
        return NextResponse.json({ error: "Project is not active" }, { status: 400 });
      }
    }

    let created = 0;
    let skipped = 0;
    const errors: ValidationError[] = [];

    // Preload all active projects and cohorts for validation
    const activeProjects = await prisma.project.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const projectMap = new Map(activeProjects.map(p => [p.name.toLowerCase(), p.id]));

    const activeCohorts = await prisma.cohort.findMany({
      where: { isActive: true },
      include: {
        project: {
          select: { id: true, name: true, isActive: true },
        },
      },
    });
    const cohortMap = new Map(activeCohorts.map(c => [
      `${c.project.name.toLowerCase()}-${c.name.toLowerCase()}`,
      { id: c.id, projectId: c.projectId }
    ]));
    const cohortIdMap = new Map(activeCohorts.map(c => [c.cohortId.toLowerCase(), c.id]));

    for (let i = 0; i < branches.length; i++) {
      const branch = branches[i] as BulkBranchInput;
      let cohortIdToUse = defaultCohortId;

      // If no default cohortId, try to resolve from CSV data
      if (!cohortIdToUse && (branch.projectName || branch.cohortName || branch.cohortId)) {
        // First try cohortId (user-defined cohort ID)
        if (branch.cohortId) {
          const resolvedCohortId = cohortIdMap.get(branch.cohortId.toLowerCase());
          if (resolvedCohortId) {
            cohortIdToUse = resolvedCohortId;
          } else {
            errors.push({
              row: i + 1,
              branchName: branch.branchName,
              error: `Cohort ID "${branch.cohortId}" not found or not active`,
            });
            skipped++;
            continue;
          }
        }
        // Try project + cohort name
        else if (branch.projectName && branch.cohortName) {
          const key = `${branch.projectName.toLowerCase()}-${branch.cohortName.toLowerCase()}`;
          const cohortInfo = cohortMap.get(key);
          if (cohortInfo) {
            cohortIdToUse = cohortInfo.id;
          } else {
            // Check if project exists but cohort doesn't
            const projectId = projectMap.get(branch.projectName.toLowerCase());
            if (!projectId) {
              errors.push({
                row: i + 1,
                branchName: branch.branchName,
                error: `Project "${branch.projectName}" not found or not active`,
              });
            } else {
              errors.push({
                row: i + 1,
                branchName: branch.branchName,
                error: `Cohort "${branch.cohortName}" not found or not active under project "${branch.projectName}"`,
              });
            }
            skipped++;
            continue;
          }
        }
      }

      try {
        await prisma.branch.create({
          data: {
            division: branch.division,
            district: branch.district,
            upazila: branch.upazila,
            branchName: branch.branchName,
            branchCode: branch.branchCode || null,
            cohortId: cohortIdToUse || null,
          },
        });
        created++;
      } catch {
        // Skip duplicates
        errors.push({
          row: i + 1,
          branchName: branch.branchName,
          error: "Duplicate branch (same division, district, upazila, branch name)",
        });
        skipped++;
      }
    }

    return NextResponse.json({
      message: `Created ${created} branches, skipped ${skipped}`,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error bulk creating branches:", error);
    return NextResponse.json(
      { error: "Failed to create branches" },
      { status: 500 }
    );
  }
}
