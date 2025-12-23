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
    } = validatedData.data;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
          ...(employeeId ? [{ employeeId }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 400 }
        );
      }
      if (existingUser.phone === phone) {
        return NextResponse.json(
          { error: "User with this phone number already exists" },
          { status: 400 }
        );
      }
      if (employeeId && existingUser.employeeId === employeeId) {
        return NextResponse.json(
          { error: "User with this employee ID already exists" },
          { status: 400 }
        );
      }
    }

    // Hash password and PIN
    const hashedPassword = await hash(password, 12);
    const hashedPin = await hash(pin, 12);

    // Create user with PENDING approval status
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        pin: hashedPin,
        password: hashedPassword,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        address: address || null,
        designation: designation || null,
        department: department || null,
        employeeId: employeeId || null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        approvalStatus: "PENDING",
        isVerified: false,
      },
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
