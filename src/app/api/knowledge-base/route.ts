import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkPermission } from "@/lib/permissions";
import { uploadToSpaces } from "@/lib/spaces";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for READ permission
    const hasPermissionResult = await checkPermission(session.user.id, "KNOWLEDGE_BASE", "READ");
    if (!hasPermissionResult) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    // Filtering parameters
    const projectIds = searchParams.get("projectIds")?.split(",").filter(Boolean);
    const cohortIds = searchParams.get("cohortIds")?.split(",").filter(Boolean);
    const departmentId = searchParams.get("departmentId");
    const fileTypeId = searchParams.get("fileTypeId");
    const yearFrom = searchParams.get("yearFrom");
    const yearTo = searchParams.get("yearTo");
    const donorName = searchParams.get("donorName");
    const vendorName = searchParams.get("vendorName");
    const search = searchParams.get("search");
    
    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      isActive: true,
      isDeleted: false,
    };

    // Filter by projects (many-to-many)
    if (projectIds && projectIds.length > 0) {
      where.projects = {
        some: {
          projectId: { in: projectIds },
        },
      };
    }

    // Filter by cohorts (many-to-many)
    if (cohortIds && cohortIds.length > 0) {
      where.cohorts = {
        some: {
          cohortId: { in: cohortIds },
        },
      };
    }

    // Filter by department
    if (departmentId) {
      where.departmentId = departmentId;
    }

    // Filter by file type
    if (fileTypeId) {
      where.fileTypeId = fileTypeId;
    }

    // Filter by year range
    if (yearFrom) {
      where.yearFrom = { gte: parseInt(yearFrom) };
    }
    if (yearTo) {
      where.yearTo = { lte: parseInt(yearTo) };
    }

    // Filter by donor name (partial match in array)
    if (donorName) {
      where.donorNames = { has: donorName };
    }

    // Filter by vendor name
    if (vendorName) {
      where.vendorName = { contains: vendorName, mode: "insensitive" };
    }

    // Search in file name
    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: "insensitive" } },
        { originalFileName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [files, totalCount] = await Promise.all([
      prisma.knowledgeFile.findMany({
        where,
        include: {
          department: {
            select: { id: true, name: true },
          },
          fileType: {
            select: { id: true, name: true },
          },
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
          projects: {
            include: {
              project: {
                select: { id: true, name: true, donorName: true },
              },
            },
          },
          cohorts: {
            include: {
              cohort: {
                select: { id: true, cohortId: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.knowledgeFile.count({ where }),
    ]);

    // Transform the response to flatten projects and cohorts
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
    console.error("Error fetching knowledge files:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge files" },
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

    // Check for WRITE permission
    const hasPermissionResult = await checkPermission(session.user.id, "KNOWLEDGE_BASE", "WRITE");
    if (!hasPermissionResult) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const formData = await request.formData();
    
    // Get file
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Check file size (4GB limit)
    const maxSize = 4 * 1024 * 1024 * 1024; // 4GB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 4GB limit" },
        { status: 400 }
      );
    }

    // Get form data
    const fileName = formData.get("fileName") as string;
    const fileDescription = formData.get("fileDescription") as string;
    const departmentId = formData.get("departmentId") as string | null;
    const fileTypeId = formData.get("fileTypeId") as string | null;
    const yearFrom = formData.get("yearFrom") as string | null;
    const yearTo = formData.get("yearTo") as string | null;
    const donorNamesJson = formData.get("donorNames") as string | null;
    const vendorName = formData.get("vendorName") as string | null;
    const projectIdsJson = formData.get("projectIds") as string | null;
    const cohortIdsJson = formData.get("cohortIds") as string | null;

    // Validate required fields
    if (!fileName || !fileName.trim()) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }
    if (!fileDescription || !fileDescription.trim()) {
      return NextResponse.json({ error: "File description is required" }, { status: 400 });
    }

    // Parse JSON arrays
    const donorNames = donorNamesJson ? JSON.parse(donorNamesJson) : [];
    const projectIds = projectIdsJson ? JSON.parse(projectIdsJson) : [];
    const cohortIds = cohortIdsJson ? JSON.parse(cohortIdsJson) : [];

    // Upload file to DigitalOcean Spaces
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await uploadToSpaces(
      fileBuffer,
      file.name,
      "knowledge-base",
      file.type || "application/octet-stream"
    );

    // Create knowledge file record with relations
    const knowledgeFile = await prisma.knowledgeFile.create({
      data: {
        fileName: fileName.trim(),
        fileDescription: fileDescription.trim(),
        fileUrl: uploadResult.url,
        fileKey: uploadResult.key,
        originalFileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        departmentId: departmentId || null,
        fileTypeId: fileTypeId || null,
        yearFrom: yearFrom ? parseInt(yearFrom) : null,
        yearTo: yearTo ? parseInt(yearTo) : null,
        donorNames,
        vendorName: vendorName?.trim() || null,
        uploadedById: session.user.id,
        // Create project relations
        projects: {
          create: projectIds.map((projectId: string) => ({
            projectId,
          })),
        },
        // Create cohort relations
        cohorts: {
          create: cohortIds.map((cohortId: string) => ({
            cohortId,
          })),
        },
      },
      include: {
        department: { select: { id: true, name: true } },
        fileType: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true, email: true } },
        projects: { include: { project: { select: { id: true, name: true } } } },
        cohorts: { include: { cohort: { select: { id: true, cohortId: true, name: true } } } },
      },
    });

    // Log the file creation
    await prisma.knowledgeFileLog.create({
      data: {
        action: "CREATE",
        knowledgeFileId: knowledgeFile.id,
        fileName: fileName.trim(),
        userId: session.user.id,
        details: JSON.stringify({
          fileName: fileName.trim(),
          originalFileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      },
    });

    return NextResponse.json({
      message: "File uploaded successfully",
      file: {
        ...knowledgeFile,
        projects: knowledgeFile.projects.map((p) => p.project),
        cohorts: knowledgeFile.cohorts.map((c) => c.cohort),
      },
    });
  } catch (error) {
    console.error("Error uploading knowledge file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
