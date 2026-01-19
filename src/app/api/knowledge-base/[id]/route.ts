import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkPermission, isSuperAdmin } from "@/lib/permissions";
import { deleteFromSpaces } from "@/lib/spaces";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermissionResult = await checkPermission(session.user.id, "KNOWLEDGE_BASE", "READ");
    if (!hasPermissionResult) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;

    const file = await prisma.knowledgeFile.findUnique({
      where: { id, isDeleted: false },
      include: {
        department: { select: { id: true, name: true } },
        fileType: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true, email: true } },
        projects: { 
          include: { 
            project: { select: { id: true, name: true, donorName: true } } 
          } 
        },
        cohorts: { 
          include: { 
            cohort: { select: { id: true, cohortId: true, name: true } } 
          } 
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Transform the response
    return NextResponse.json({
      ...file,
      projects: file.projects.map((p) => p.project),
      cohorts: file.cohorts.map((c) => c.cohort),
    });
  } catch (error) {
    console.error("Error fetching knowledge file:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermissionResult = await checkPermission(session.user.id, "KNOWLEDGE_BASE", "WRITE");
    if (!hasPermissionResult) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      fileName,
      fileDescription,
      departmentId,
      fileTypeId,
      yearFrom,
      yearTo,
      donorNames,
      vendorName,
      projectIds,
      cohortIds,
      isActive,
    } = body;

    // Validate required fields
    if (!fileName || !fileName.trim()) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }
    if (!fileDescription || !fileDescription.trim()) {
      return NextResponse.json({ error: "File description is required" }, { status: 400 });
    }

    // Check if file exists
    const existingFile = await prisma.knowledgeFile.findUnique({
      where: { id },
    });

    if (!existingFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Update file with new relations
    const updatedFile = await prisma.$transaction(async (tx) => {
      // Delete existing project relations
      await tx.knowledgeFileProject.deleteMany({
        where: { knowledgeFileId: id },
      });

      // Delete existing cohort relations
      await tx.knowledgeFileCohort.deleteMany({
        where: { knowledgeFileId: id },
      });

      // Update the file
      return tx.knowledgeFile.update({
        where: { id },
        data: {
          fileName: fileName.trim(),
          fileDescription: fileDescription.trim(),
          departmentId: departmentId || null,
          fileTypeId: fileTypeId || null,
          yearFrom: yearFrom ? parseInt(yearFrom) : null,
          yearTo: yearTo ? parseInt(yearTo) : null,
          donorNames: donorNames || [],
          vendorName: vendorName?.trim() || null,
          isActive: isActive !== false,
          // Create new project relations
          projects: {
            create: (projectIds || []).map((projectId: string) => ({
              projectId,
            })),
          },
          // Create new cohort relations
          cohorts: {
            create: (cohortIds || []).map((cohortId: string) => ({
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
    });

    // Log the update
    await prisma.knowledgeFileLog.create({
      data: {
        action: "UPDATE",
        knowledgeFileId: id,
        fileName: fileName.trim(),
        userId: session.user.id,
        details: JSON.stringify({
          fileName: fileName.trim(),
          fileDescription: fileDescription?.trim(),
          departmentId,
          fileTypeId,
        }),
      },
    });

    return NextResponse.json({
      message: "File updated successfully",
      file: {
        ...updatedFile,
        projects: updatedFile.projects.map((p) => p.project),
        cohorts: updatedFile.cohorts.map((c) => c.cohort),
      },
    });
  } catch (error) {
    console.error("Error updating knowledge file:", error);
    return NextResponse.json(
      { error: "Failed to update file" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only users with DELETE permission can delete files
    const hasPermissionResult = await checkPermission(session.user.id, "KNOWLEDGE_BASE", "DELETE");
    if (!hasPermissionResult) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    // Get the file to access its storage key
    const file = await prisma.knowledgeFile.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // If permanent delete is requested, only super admin can do it
    if (permanent) {
      const isSuper = await isSuperAdmin(session.user.id);
      if (!isSuper) {
        return NextResponse.json({ error: "Only Super Admin can permanently delete files" }, { status: 403 });
      }

      // Delete from storage
      try {
        await deleteFromSpaces(file.fileKey);
      } catch (storageError) {
        console.error("Error deleting file from storage:", storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Permanently delete from database (cascade will handle junction tables)
      await prisma.knowledgeFile.delete({
        where: { id },
      });

      // Log the permanent delete
      await prisma.knowledgeFileLog.create({
        data: {
          action: "PERMANENT_DELETE",
          knowledgeFileId: id,
          fileName: file.fileName,
          userId: session.user.id,
          details: JSON.stringify({ fileName: file.fileName, originalFileName: file.originalFileName }),
        },
      });

      return NextResponse.json({
        message: "File permanently deleted",
      });
    }

    // Soft delete - mark as deleted
    await prisma.knowledgeFile.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: session.user.id,
      },
    });

    // Log the soft delete
    await prisma.knowledgeFileLog.create({
      data: {
        action: "DELETE",
        knowledgeFileId: id,
        fileName: file.fileName,
        userId: session.user.id,
        details: JSON.stringify({ fileName: file.fileName }),
      },
    });

    return NextResponse.json({
      message: "File moved to recycle bin",
    });
  } catch (error) {
    console.error("Error deleting knowledge file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}

// PATCH endpoint for restore
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super admin can restore files
    const isSuper = await isSuperAdmin(session.user.id);
    if (!isSuper) {
      return NextResponse.json({ error: "Only Super Admin can restore files" }, { status: 403 });
    }

    const { id } = await params;

    const file = await prisma.knowledgeFile.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (!file.isDeleted) {
      return NextResponse.json({ error: "File is not deleted" }, { status: 400 });
    }

    // Restore the file
    const restoredFile = await prisma.knowledgeFile.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedById: null,
      },
    });

    // Log the restore
    await prisma.knowledgeFileLog.create({
      data: {
        action: "RESTORE",
        knowledgeFileId: id,
        fileName: file.fileName,
        userId: session.user.id,
        details: JSON.stringify({ fileName: file.fileName }),
      },
    });

    return NextResponse.json({
      message: "File restored successfully",
      file: restoredFile,
    });
  } catch (error) {
    console.error("Error restoring knowledge file:", error);
    return NextResponse.json(
      { error: "Failed to restore file" },
      { status: 500 }
    );
  }
}
