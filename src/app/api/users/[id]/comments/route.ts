import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Helper to check if user can add comments (supervisors and above)
async function canAddComment(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userRole: true },
  });
  
  if (!user?.userRole) return false;
  
  // Roles that can add comments: Super Admin, HO Admin, Project Coordinator, Trainer (supervisor roles)
  const allowedRoles = ["SUPER_ADMIN", "HO_ADMIN", "PROJECT_COORDINATOR", "TRAINER"];
  return allowedRoles.includes(user.userRole.name);
}

// Helper to check if user can edit/delete comments
async function canEditDeleteComment(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userRole: true },
  });
  
  if (!user?.userRole) return false;
  
  // Only Super Admin and HO Admin can edit/delete comments
  const allowedRoles = ["SUPER_ADMIN", "HO_ADMIN"];
  return allowedRoles.includes(user.userRole.name);
}

// GET: Fetch all comments for a user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: userId } = await params;
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const comments = await prisma.adminComment.findMany({
      where: { userId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            userRole: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Check if current user can edit/delete
    const canEdit = await canEditDeleteComment(session.user.id);

    return NextResponse.json({
      comments,
      canEdit,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST: Add a new comment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: userId } = await params;
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can add comments
    const canAdd = await canAddComment(session.user.id);
    if (!canAdd) {
      return NextResponse.json(
        { error: "You don't have permission to add comments" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { comment } = body;

    if (!comment || comment.trim() === "") {
      return NextResponse.json(
        { error: "Comment is required" },
        { status: 400 }
      );
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const newComment = await prisma.adminComment.create({
      data: {
        userId,
        authorId: session.user.id,
        comment: comment.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            userRole: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
