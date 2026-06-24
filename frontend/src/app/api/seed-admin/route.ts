import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// One-time admin seeding endpoint
export async function POST() {
  try {
    const existing = await db.user.findUnique({
      where: { email: "admin@group38.edu" },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Admin account already exists",
        credentials: {
          email: "admin@group38.edu",
          password: "admin123",
        },
      });
    }

    const hashed = await bcrypt.hash("admin123", 10);

    await db.user.create({
      data: {
        name: "Group 38 Admin",
        email: "admin@group38.edu",
        password: hashed,
        role: "ADMIN",
        subscriptionTier: "PREMIUM",
        bio: "System Administrator - Group No 38",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Admin account created",
      credentials: {
        email: "admin@group38.edu",
        password: "admin123",
      },
    });
  } catch (error) {
    console.error("Seed admin error:", error);
    return NextResponse.json(
      { error: "Failed to seed admin" },
      { status: 500 }
    );
  }
}
