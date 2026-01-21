import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";

// Secure file serving - checks authentication and permissions before serving files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: "Authentication required to access files" }),
        { 
          status: 401, 
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const { path } = await params;
    const fullPath = path.join("/");
    
    // Determine the file type based on path
    const fileType = determineFileType(fullPath);
    
    // Check permissions based on file type
    const hasAccess = await checkFileAccess(session.user.id, fileType, fullPath);
    
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ error: "You do not have permission to access this file" }),
        { 
          status: 403, 
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Construct the CDN URL
    const cdnEndpoint = process.env.DO_SPACES_CDN_ENDPOINT;
    const fileUrl = `${cdnEndpoint}/sdp-ams/${fullPath}`;

    // Fetch the file from the CDN
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      return new NextResponse(
        JSON.stringify({ error: "File not found" }),
        { 
          status: 404, 
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Get the file content
    const fileBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    
    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to serve file" }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

function determineFileType(path: string): string {
  if (path.startsWith("profile-images/")) return "profile";
  if (path.startsWith("knowledge-base/")) return "knowledge-base";
  if (path.startsWith("documents/")) return "document";
  if (path.startsWith("comment-attachments/")) return "comment";
  return "unknown";
}

async function checkFileAccess(userId: string, fileType: string, path: string): Promise<boolean> {
  // Profile images - user can access their own, admins can access all
  if (fileType === "profile") {
    // Everyone can see profile images (for now - they're in user lists)
    return true;
  }
  
  // Knowledge base files - check KNOWLEDGE_BASE READ permission
  if (fileType === "knowledge-base") {
    return await checkPermission(userId, "KNOWLEDGE_BASE", "READ");
  }
  
  // Documents - check based on context
  if (fileType === "document") {
    // For now, authenticated users can access documents
    // This can be made more restrictive based on requirements
    return true;
  }
  
  // Comment attachments - authenticated users can view
  if (fileType === "comment") {
    return true;
  }
  
  return false;
}
