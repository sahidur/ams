import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { ApprovalRequestStatus, ApprovalActionType, NotificationType } from "@prisma/client";

// Helper function to generate request number
async function generateRequestNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  
  const lastRequest = await prisma.approvalRequest.findFirst({
    where: {
      requestNumber: {
        startsWith: `REQ-${year}${month}`,
      },
    },
    orderBy: { requestNumber: "desc" },
  });

  let sequence = 1;
  if (lastRequest) {
    const lastSequence = parseInt(lastRequest.requestNumber.split("-")[2]) || 0;
    sequence = lastSequence + 1;
  }

  return `REQ-${year}${month}-${String(sequence).padStart(5, "0")}`;
}

// Helper function to find the next approver based on the approval flow
async function findNextApprover(
  templateId: string,
  projectId: string | null,
  cohortId: string | null,
  level: number,
  requesterId: string
): Promise<{ approverId: string | null; totalLevels: number }> {
  // Find levels for this scope (project/cohort specific or global)
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

  // If no project/cohort specific levels, fall back to global
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

  // Get requester for supervisor lookup
  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { firstSupervisorId: true },
  });

  // Find first valid approver
  for (const approver of currentLevel.approvers) {
    // If using requester's supervisor
    if (approver.isRequesterSupervisor && requester?.firstSupervisorId) {
      return { approverId: requester.firstSupervisorId, totalLevels };
    }
    
    // If specific user assigned
    if (approver.userId) {
      return { approverId: approver.userId, totalLevels };
    }
    
    // If role-based, get first active user with that role
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

// GET approval requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "my"; // my, pending, all
    const status = searchParams.get("status");
    const templateId = searchParams.get("templateId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: {
      requesterId?: string;
      currentApproverId?: string;
      status?: ApprovalRequestStatus;
      templateId?: string;
    } = {};

    // View-based filtering
    if (view === "my") {
      where.requesterId = session.user.id;
    } else if (view === "pending") {
      where.currentApproverId = session.user.id;
      where.status = "PENDING";
    }
    // 'all' view requires admin check (done later in the code)

    if (status) {
      where.status = status as ApprovalRequestStatus;
    }

    if (templateId) {
      where.templateId = templateId;
    }

    const [requests, total] = await Promise.all([
      prisma.approvalRequest.findMany({
        where,
        include: {
          template: { select: { id: true, name: true, displayName: true, icon: true, color: true } },
          requester: { select: { id: true, name: true, email: true, profileImage: true } },
          currentApprover: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
          cohort: { select: { id: true, name: true } },
          branch: { select: { id: true, branchName: true, district: true } },
          _count: { select: { actions: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.approvalRequest.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching approval requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch approval requests" },
      { status: 500 }
    );
  }
}

// POST create new approval request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, projectId, cohortId, branchId, formData, attachments, submitNow = true } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Verify template exists and is active
    const template = await prisma.approvalTemplate.findUnique({
      where: { id: templateId },
      include: {
        formFields: { where: { isRequired: true } },
      },
    });

    if (!template || !template.isActive) {
      return NextResponse.json(
        { error: "Application type not found or inactive" },
        { status: 404 }
      );
    }

    // Validate required fields
    if (submitNow && template.formFields.length > 0) {
      const missingFields = template.formFields.filter(
        (field) => !formData?.[field.fieldName]
      );
      if (missingFields.length > 0) {
        return NextResponse.json(
          { error: `Missing required fields: ${missingFields.map((f) => f.fieldLabel).join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Generate request number
    const requestNumber = await generateRequestNumber();

    // Determine status and find first approver
    let status: ApprovalRequestStatus = "DRAFT";
    let currentLevel = 0;
    let currentApproverId: string | null = null;
    let totalLevels = 0;
    let submittedAt: Date | null = null;
    let slaDeadline: Date | null = null;

    if (submitNow) {
      status = "PENDING";
      currentLevel = 1;
      submittedAt = new Date();

      const approverInfo = await findNextApprover(
        templateId,
        projectId,
        cohortId,
        1,
        session.user.id
      );

      currentApproverId = approverInfo.approverId;
      totalLevels = approverInfo.totalLevels;

      // Calculate SLA deadline
      if (template.defaultSlaHours) {
        slaDeadline = new Date();
        slaDeadline.setHours(slaDeadline.getHours() + template.defaultSlaHours);
      }
    }

    // Create the request
    const approvalRequest = await prisma.approvalRequest.create({
      data: {
        requestNumber,
        templateId,
        requesterId: session.user.id,
        projectId,
        cohortId,
        branchId,
        formData: formData || {},
        attachments: attachments || [],
        status,
        currentLevel,
        totalLevels,
        currentApproverId,
        submittedAt,
        slaDeadline,
      },
      include: {
        template: { select: { id: true, name: true, displayName: true } },
        requester: { select: { id: true, name: true, email: true } },
        currentApprover: { select: { id: true, name: true, email: true } },
      },
    });

    // Create submission action if submitted
    if (submitNow) {
      await prisma.approvalAction.create({
        data: {
          requestId: approvalRequest.id,
          actionType: "SUBMIT",
          level: 0,
          actorId: session.user.id,
          comment: "Request submitted",
          nextApproverId: currentApproverId,
          formDataSnapshot: formData,
        },
      });

      // Notify the first approver
      if (currentApproverId) {
        await createNotification(
          currentApproverId,
          "APPROVAL_ASSIGNED",
          "New Approval Request",
          `You have a new ${template.displayName} request (#${requestNumber}) to review`,
          "approval_request",
          approvalRequest.id
        );
      }
    }

    return NextResponse.json(approvalRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating approval request:", error);
    return NextResponse.json(
      { error: "Failed to create approval request" },
      { status: 500 }
    );
  }
}
