import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { decryptFaceEmbedding } from "@/lib/crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { classId } = await params;

    // Get the class with students enrolled in the class (not batch)
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          include: {
            student: {
              include: {
                faceEncodings: true,
              },
            },
          },
        },
      },
    });

    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Extract face encodings for all students in the class and decrypt them
    const knownFaces: { id: string; name: string; embedding: number[] }[] = [];
    
    for (const s of classData.students) {
      if (s.student.faceEncodings.length > 0) {
        const faceEncoding = s.student.faceEncodings[0];
        
        try {
          let embedding: number[];
          
          // Check if the encoding is encrypted (has encryption fields)
          if (faceEncoding.encryptionIv && faceEncoding.encryptionTag && typeof faceEncoding.encoding === "string") {
            // Decrypt the embedding
            embedding = decryptFaceEmbedding(
              faceEncoding.encoding as string,
              faceEncoding.encryptionIv,
              faceEncoding.encryptionTag
            );
          } else if (Array.isArray(faceEncoding.encoding)) {
            // Legacy unencrypted data - use as is
            embedding = faceEncoding.encoding as unknown as number[];
          } else {
            // Try parsing as JSON if it's a string (another legacy format)
            try {
              embedding = typeof faceEncoding.encoding === "string" 
                ? JSON.parse(faceEncoding.encoding) 
                : faceEncoding.encoding as unknown as number[];
            } catch {
              console.error(`Failed to parse face encoding for user ${s.student.id}`);
              continue;
            }
          }
          
          if (embedding && Array.isArray(embedding) && embedding.length > 0) {
            knownFaces.push({
              id: s.student.id,
              name: s.student.name,
              embedding,
            });
          }
        } catch (err) {
          console.error(`Error decrypting face encoding for user ${s.student.id}:`, err);
          // Skip this face if decryption fails
          continue;
        }
      }
    }

    return NextResponse.json(knownFaces);
  } catch (error) {
    console.error("Error fetching faces:", error);
    return NextResponse.json(
      { error: "Failed to fetch faces" },
      { status: 500 }
    );
  }
}
