import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET form fields for a template
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

    const fields = await prisma.approvalFormField.findMany({
      where: { templateId: id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(fields);
  } catch (error) {
    console.error("Error fetching form fields:", error);
    return NextResponse.json(
      { error: "Failed to fetch form fields" },
      { status: 500 }
    );
  }
}

// POST create or replace form fields
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
    const { fields } = body;

    if (!Array.isArray(fields)) {
      return NextResponse.json(
        { error: "Fields must be an array" },
        { status: 400 }
      );
    }

    // Verify template exists
    const template = await prisma.approvalTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Delete existing fields and create new ones
    await prisma.approvalFormField.deleteMany({
      where: { templateId: id },
    });

    const createdFields = await prisma.approvalFormField.createMany({
      data: fields.map((field: {
        fieldName: string;
        fieldLabel: string;
        fieldType: string;
        placeholder?: string;
        helpText?: string;
        isRequired?: boolean;
        options?: string[];
        validation?: string;
        defaultValue?: string;
        sortOrder?: number;
        dependsOnField?: string;
        dependsOnValue?: string;
        isActive?: boolean;
      }, index: number) => ({
        templateId: id,
        fieldName: field.fieldName,
        fieldLabel: field.fieldLabel,
        fieldType: field.fieldType,
        placeholder: field.placeholder,
        helpText: field.helpText,
        isRequired: field.isRequired || false,
        options: field.options || [],
        validation: field.validation,
        defaultValue: field.defaultValue,
        sortOrder: field.sortOrder ?? index,
        dependsOnField: field.dependsOnField,
        dependsOnValue: field.dependsOnValue,
        isActive: field.isActive !== false,
      })),
    });

    // Fetch and return the created fields
    const newFields = await prisma.approvalFormField.findMany({
      where: { templateId: id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(newFields, { status: 201 });
  } catch (error) {
    console.error("Error saving form fields:", error);
    return NextResponse.json(
      { error: "Failed to save form fields" },
      { status: 500 }
    );
  }
}
