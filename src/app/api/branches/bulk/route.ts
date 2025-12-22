import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !["ADMIN", "HO_USER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { branches } = body;

    if (!Array.isArray(branches) || branches.length === 0) {
      return NextResponse.json(
        { error: "No branches provided" },
        { status: 400 }
      );
    }

    let created = 0;
    let skipped = 0;

    for (const branch of branches) {
      try {
        await prisma.branch.create({
          data: {
            division: branch.division,
            district: branch.district,
            upazila: branch.upazila,
            branchName: branch.branchName,
            branchCode: branch.branchCode || null,
          },
        });
        created++;
      } catch {
        // Skip duplicates
        skipped++;
      }
    }

    return NextResponse.json({
      message: `Created ${created} branches, skipped ${skipped} duplicates`,
      created,
      skipped,
    });
  } catch (error) {
    console.error("Error bulk creating branches:", error);
    return NextResponse.json(
      { error: "Failed to create branches" },
      { status: 500 }
    );
  }
}
