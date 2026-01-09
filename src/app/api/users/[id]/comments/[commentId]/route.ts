import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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

// PUT: Update a comment
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { commentId } = await params;
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can edit comments
    const canEdit = await canEditDeleteComment(session.user.id);
    if (!canEdit) {
      return NextResponse.json(
        { error: "You don't have permission to edit comments" },
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

    // Verify comment exists
    const existingComment = await prisma.adminComment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    const updatedComment = await prisma.adminComment.update({
      where: { id: commentId },
      data: {
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

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a comment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { commentId } = await params;
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can delete comments
    const canDelete = await canEditDeleteComment(session.user.id);
    if (!canDelete) {
      return NextResponse.json(
        { error: "You don't have permission to delete comments" },
        { status: 403 }
      );
    }

    // Verify comment exists
    const existingComment = await prisma.adminComment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    await prisma.adminComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
