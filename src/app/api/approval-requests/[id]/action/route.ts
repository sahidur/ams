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

// Helper function to get previous approver from action history
async function getPreviousApprover(requestId: string, currentLevel: number): Promise<string | null> {
  // Find the last action at the previous level or the requester
  const previousAction = await prisma.approvalAction.findFirst({
    where: {
      requestId,
      level: { lt: currentLevel },
    },
    orderBy: { createdAt: "desc" },
  });

  if (previousAction) {
    return previousAction.actorId;
  }

  // If no previous action, return to requester
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    select: { requesterId: true },
  });

  return request?.requesterId || null;
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

// POST perform action on approval request
export async function POST(
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
    const { action, comment } = body;

    if (!action || !["APPROVE", "DECLINE", "SEND_BACK"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be APPROVE, DECLINE, or SEND_BACK" },
        { status: 400 }
      );
    }

    // Get the request with template info
    const approvalRequest = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        template: { select: { displayName: true, defaultSlaHours: true } },
        requester: { select: { id: true, name: true } },
      },
    });

    if (!approvalRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Verify current user is the approver
    if (approvalRequest.currentApproverId !== session.user.id) {
      return NextResponse.json(
        { error: "You are not authorized to perform this action" },
        { status: 403 }
      );
    }

    // Verify request is pending
    if (approvalRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "This request is not pending approval" },
        { status: 400 }
      );
    }

    // Validate comment for SEND_BACK and DECLINE
    if ((action === "SEND_BACK" || action === "DECLINE") && !comment) {
      return NextResponse.json(
        { error: "Comment is required for this action" },
        { status: 400 }
      );
    }

    // Calculate response time
    const lastAction = await prisma.approvalAction.findFirst({
      where: { requestId: id },
      orderBy: { createdAt: "desc" },
    });
    const responseTimeHours = lastAction
      ? (new Date().getTime() - lastAction.createdAt.getTime()) / (1000 * 60 * 60)
      : null;
    const wasOverdue = approvalRequest.slaDeadline
      ? new Date() > approvalRequest.slaDeadline
      : false;

    let updateData: {
      status: ApprovalRequestStatus;
      currentLevel: number;
      currentApproverId: string | null;
      completedAt?: Date;
      slaDeadline?: Date | null;
    };

    let notificationType: NotificationType;
    let notificationTitle: string;
    let notificationMessage: string;
    let notifyUserId: string | null = null;

    if (action === "APPROVE") {
      // Check if this is the final level
      const nextLevel = approvalRequest.currentLevel + 1;
      const { approverId: nextApproverId, totalLevels } = await findNextApprover(
        approvalRequest.templateId,
        approvalRequest.projectId,
        approvalRequest.cohortId,
        nextLevel,
        approvalRequest.requesterId
      );

      if (nextLevel > totalLevels || !nextApproverId) {
        // Final approval
        updateData = {
          status: "APPROVED",
          currentLevel: approvalRequest.currentLevel,
          currentApproverId: null,
          completedAt: new Date(),
          slaDeadline: null,
        };

        notificationType = "APPROVAL_FINAL";
        notificationTitle = "Request Approved";
        notificationMessage = `Your ${approvalRequest.template.displayName} request (#${approvalRequest.requestNumber}) has been fully approved`;
        notifyUserId = approvalRequest.requesterId;
      } else {
        // Move to next level
        const slaDeadline = new Date();
        if (approvalRequest.template.defaultSlaHours) {
          slaDeadline.setHours(slaDeadline.getHours() + approvalRequest.template.defaultSlaHours);
        }

        updateData = {
          status: "PENDING",
          currentLevel: nextLevel,
          currentApproverId: nextApproverId,
          slaDeadline,
        };

        // Notify requester about progress
        await createNotification(
          approvalRequest.requesterId,
          "APPROVAL_APPROVED",
          "Approval Progress",
          `Your ${approvalRequest.template.displayName} request has been approved at level ${approvalRequest.currentLevel}`,
          "approval_request",
          id
        );

        // Notify next approver
        notificationType = "APPROVAL_ASSIGNED";
        notificationTitle = "New Approval Request";
        notificationMessage = `You have a new ${approvalRequest.template.displayName} request (#${approvalRequest.requestNumber}) to review`;
        notifyUserId = nextApproverId;
      }
    } else if (action === "DECLINE") {
      updateData = {
        status: "DECLINED",
        currentLevel: approvalRequest.currentLevel,
        currentApproverId: null,
        completedAt: new Date(),
        slaDeadline: null,
      };

      notificationType = "APPROVAL_DECLINED";
      notificationTitle = "Request Declined";
      notificationMessage = `Your ${approvalRequest.template.displayName} request (#${approvalRequest.requestNumber}) has been declined: ${comment}`;
      notifyUserId = approvalRequest.requesterId;
    } else {
      // SEND_BACK
      const previousApproverId = await getPreviousApprover(id, approvalRequest.currentLevel);

      updateData = {
        status: "SENT_BACK",
        currentLevel: Math.max(0, approvalRequest.currentLevel - 1),
        currentApproverId: previousApproverId,
        slaDeadline: null,
      };

      notificationType = "APPROVAL_SENT_BACK";
      notificationTitle = "Request Sent Back";
      notificationMessage = `${approvalRequest.template.displayName} request (#${approvalRequest.requestNumber}) has been sent back: ${comment}`;
      notifyUserId = previousApproverId;
    }

    // Update the request
    const updatedRequest = await prisma.approvalRequest.update({
      where: { id },
      data: updateData,
      include: {
        template: { select: { id: true, displayName: true } },
        currentApprover: { select: { id: true, name: true } },
      },
    });

    // Create action record
    await prisma.approvalAction.create({
      data: {
        requestId: id,
        actionType: action as ApprovalActionType,
        level: approvalRequest.currentLevel,
        actorId: session.user.id,
        comment,
        previousApproverId: approvalRequest.currentApproverId,
        nextApproverId: updateData.currentApproverId,
        wasOverdue,
        responseTimeHours,
      },
    });

    // Send notification
    if (notifyUserId) {
      await createNotification(
        notifyUserId,
        notificationType!,
        notificationTitle!,
        notificationMessage!,
        "approval_request",
        id
      );
    }

    return NextResponse.json({
      message: `Request ${action.toLowerCase().replace("_", " ")} successfully`,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Error processing approval action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
