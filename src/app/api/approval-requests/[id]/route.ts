import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { ApprovalRequestStatus, ApprovalActionType, NotificationType } from "@prisma/client";

// Helper function to find the next approver
async function findNextApprover(
  templateId: string,
  projectId: string | null,
  cohortId: string | null,
  level: number,
  requesterId: string
): Promise<{ approverId: string | null; totalLevels: number }> {
  let levels = await prisma.approvalLevel.findMany({
    where: {
      templateId,
      projectId: projectId || null,
      cohortId: cohortId || null,
      isActive: true,
    },
    include: {
      approvers: {
        where: { isActive: true },
        include: {
          user: true,
          userRole: { include: { users: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { levelNumber: "asc" },
  });

  if (levels.length === 0 && (projectId || cohortId)) {
    levels = await prisma.approvalLevel.findMany({
      where: {
        templateId,
        projectId: null,
        cohortId: null,
        isActive: true,
      },
      include: {
        approvers: {
          where: { isActive: true },
          include: {
            user: true,
            userRole: { include: { users: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { levelNumber: "asc" },
    });
  }

  const totalLevels = levels.length;
  
  if (level > totalLevels) {
    return { approverId: null, totalLevels };
  }

  const currentLevel = levels.find((l) => l.levelNumber === level);
  if (!currentLevel || currentLevel.approvers.length === 0) {
    return { approverId: null, totalLevels };
  }

  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { firstSupervisorId: true },
  });

  for (const approver of currentLevel.approvers) {
    if (approver.isRequesterSupervisor && requester?.firstSupervisorId) {
      return { approverId: requester.firstSupervisorId, totalLevels };
    }
    
    if (approver.userId) {
      return { approverId: approver.userId, totalLevels };
    }
    
    if (approver.userRole && approver.userRole.users.length > 0) {
      const activeUser = approver.userRole.users.find(
        (u) => u.isActive && u.approvalStatus === "APPROVED"
      );
      if (activeUser) {
        return { approverId: activeUser.id, totalLevels };
      }
    }
  }

  return { approverId: null, totalLevels };
}

// Helper function to create notification
async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  entityType?: string,
  entityId?: string
) {
  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      entityType,
      entityId,
    },
  });
}

// GET single approval request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const approvalRequest = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
            icon: true,
            color: true,
            bodyTemplate: true,
            formFields: { orderBy: { sortOrder: "asc" } },
          },
        },
        requester: { select: { id: true, name: true, email: true, profileImage: true } },
        currentApprover: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        cohort: { select: { id: true, name: true } },
        branch: { select: { id: true, branchName: true, district: true, upazila: true } },
        actions: {
          include: {
            actor: { select: { id: true, name: true, email: true, profileImage: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!approvalRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Check access permission
    const isRequester = approvalRequest.requesterId === session.user.id;
    const isCurrentApprover = approvalRequest.currentApproverId === session.user.id;
    const wasApprover = approvalRequest.actions.some(
      (a) => a.actorId === session.user.id
    );

    // TODO: Add admin/auditor role check

    if (!isRequester && !isCurrentApprover && !wasApprover) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      ...approvalRequest,
      canApprove: isCurrentApprover && approvalRequest.status === "PENDING",
    });
  } catch (error) {
    console.error("Error fetching approval request:", error);
    return NextResponse.json(
      { error: "Failed to fetch approval request" },
      { status: 500 }
    );
  }
}

// PUT update approval request (only for drafts or resubmission)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { formData, attachments, submitNow } = body;

    const existing = await prisma.approvalRequest.findUnique({
      where: { id },
      include: { template: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (existing.requesterId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (existing.status !== "DRAFT" && existing.status !== "SENT_BACK") {
      return NextResponse.json(
        { error: "Only drafts or sent-back requests can be updated" },
        { status: 400 }
      );
    }

    let updateData: {
      formData?: object;
      attachments?: string[];
      status?: ApprovalRequestStatus;
      currentLevel?: number;
      currentApproverId?: string | null;
      submittedAt?: Date;
      slaDeadline?: Date;
    } = {
      formData: formData || existing.formData,
      attachments: attachments || existing.attachments,
    };

    // If submitting/resubmitting
    if (submitNow) {
      updateData.status = "PENDING";
      updateData.currentLevel = 1;
      updateData.submittedAt = new Date();

      const approverInfo = await findNextApprover(
        existing.templateId,
        existing.projectId,
        existing.cohortId,
        1,
        existing.requesterId
      );

      updateData.currentApproverId = approverInfo.approverId;

      if (existing.template.defaultSlaHours) {
        const slaDeadline = new Date();
        slaDeadline.setHours(slaDeadline.getHours() + existing.template.defaultSlaHours);
        updateData.slaDeadline = slaDeadline;
      }
    }

    const updatedRequest = await prisma.approvalRequest.update({
      where: { id },
      data: updateData,
      include: {
        template: { select: { id: true, displayName: true } },
        currentApprover: { select: { id: true, name: true } },
      },
    });

    // Create resubmit action if applicable
    if (submitNow && existing.status === "SENT_BACK") {
      await prisma.approvalAction.create({
        data: {
          requestId: id,
          actionType: "RESUBMIT",
          level: 0,
          actorId: session.user.id,
          comment: "Request resubmitted",
          nextApproverId: updateData.currentApproverId,
          formDataSnapshot: formData,
        },
      });

      // Notify the approver
      if (updateData.currentApproverId) {
        await createNotification(
          updateData.currentApproverId,
          "APPROVAL_RESUBMITTED",
          "Request Resubmitted",
          `${updatedRequest.template.displayName} request (#${existing.requestNumber}) has been resubmitted`,
          "approval_request",
          id
        );
      }
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Error updating approval request:", error);
    return NextResponse.json(
      { error: "Failed to update approval request" },
      { status: 500 }
    );
  }
}

// DELETE approval request (only drafts)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.approvalRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (existing.requesterId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (existing.status !== "DRAFT") {
      // Cancel instead of delete for non-drafts
      await prisma.approvalRequest.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      await prisma.approvalAction.create({
        data: {
          requestId: id,
          actionType: "CANCEL",
          level: existing.currentLevel,
          actorId: session.user.id,
          comment: "Request cancelled by requester",
        },
      });

      return NextResponse.json({ message: "Request cancelled" });
    }

    await prisma.approvalRequest.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Request deleted" });
  } catch (error) {
    console.error("Error deleting approval request:", error);
    return NextResponse.json(
      { error: "Failed to delete approval request" },
      { status: 500 }
    );
  }
}
