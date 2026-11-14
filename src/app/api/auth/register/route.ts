import { NextResponse } from "next/server";
import { z } from "zod";
import { addAuditLog, createUser, listUsers } from "@/lib/hvut/db";
import { User } from "@/lib/adapters/types";

const RegisterSchema = z.object({
  firstName: z.string().min(1, "First Name is required"),
  lastName: z.string().min(1, "Last Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(7, "Valid phone number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid registration details" },
        { status: 400 },
      );
    }

    const { firstName, lastName, email, phone, password } = parsed.data;
    const existing = listUsers().find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please Sign In." },
        { status: 409 },
      );
    }

    const user: User = {
      id: `usr-${Date.now()}`,
      email: email.trim().toLowerCase(),
      name: `${firstName.trim()} ${lastName.trim()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      password,
      role: "OWNER_OP",
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
    };

    createUser(user);
    addAuditLog({
      actorRole: "OWNER_OP",
      actorName: user.name,
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: user.id,
      details: `Registered new user account (${user.email})`,
    });

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 500 },
    );
  }
}

