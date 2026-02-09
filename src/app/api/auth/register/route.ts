import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = registerSchema.safeParse(body);
    if (!validatedData.success) {
      const firstError = validatedData.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "Validation error" },
        { status: 400 }
      );
    }

    const { 
      name, 
      email, 
      phone, 
      pin, 
      password,
      dateOfBirth,
      gender,
      address,
      designation,
      department,
      employeeId,
      joiningDate,
      projectId,
      cohortId,
    } = validatedData.data;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone },
          { employeeId },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with these details already exists" },
        { status: 400 }
      );
    }

    // Hash password and PIN
    const hashedPassword = await hash(password, 12);
    const hashedPin = await hash(pin, 12);

    // Create user and project assignment in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user with PENDING approval status
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          phone,
          pin: hashedPin,
          password: hashedPassword,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          address,
          designation,
          department,
          employeeId,
          joiningDate: new Date(joiningDate),
          approvalStatus: "PENDING",
          isVerified: false,
        },
      });

      // Create UserProjectAssignment for the selected project and cohort
      await tx.userProjectAssignment.create({
        data: {
          userId: newUser.id,
          projectId,
          cohortId,
        },
      });

      return newUser;
    });

    return NextResponse.json({
      success: true,
      message: "Registration successful. Please wait for admin approval.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
