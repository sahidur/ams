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

    const { name, email, phone, pin, password } = validatedData.data;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email or phone already exists" },
        { status: 400 }
      );
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
        approvalStatus: "PENDING",
        isVerified: false,
      },
    });

    return NextResponse.json({
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
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
