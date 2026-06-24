import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  reason: z.string().min(20, "Please provide a detailed reason (min 20 characters)"),
  platform: z.string().min(1, "Select a platform"),
  useCase: z.string().min(10, "Please describe your use case (min 10 characters)"),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const applications = await db.premiumApplication.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Fetch applications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "Admins already have full access" },
        { status: 400 }
      );
    }

    if (user.subscriptionTier === "PREMIUM") {
      return NextResponse.json(
        { error: "You already have premium access" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    // Check for existing pending application
    const existing = await db.premiumApplication.findFirst({
      where: { userId: user.id, status: "PENDING" },
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "You already have a pending application. Please wait for admin review.",
        },
        { status: 409 }
      );
    }

    const application = await db.premiumApplication.create({
      data: {
        userId: user.id,
        reason: parsed.data.reason,
        platform: parsed.data.platform,
        useCase: parsed.data.useCase,
        status: "PENDING",
      },
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "apply_premium",
        detail: `Applied for premium (${parsed.data.platform})`,
      },
    });

    return NextResponse.json({
      success: true,
      application,
    });
  } catch (error) {
    console.error("Premium application error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}
