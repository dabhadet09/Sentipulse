import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: { status?: string } = {};
    if (status && status !== "all") {
      where.status = status.toUpperCase();
    }

    const applications = await db.premiumApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            subscriptionTier: true,
            createdAt: true,
            _count: { select: { analyses: true } },
          },
        },
      },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Admin fetch applications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { applicationId, action, adminNote } = body;

    if (!applicationId || !action) {
      return NextResponse.json(
        { error: "Missing applicationId or action" },
        { status: 400 }
      );
    }

    const application = await db.premiumApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    let newStatus: string;
    if (action === "approve") {
      newStatus = "APPROVED";
    } else if (action === "reject") {
      newStatus = "REJECTED";
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await db.$transaction([
      db.premiumApplication.update({
        where: { id: applicationId },
        data: {
          status: newStatus,
          adminNote: adminNote || null,
          reviewedAt: new Date(),
          reviewedBy: admin.id,
        },
      }),
      ...(action === "approve"
        ? [
            db.user.update({
              where: { id: application.userId },
              data: { subscriptionTier: "PREMIUM" },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("Admin review application error:", error);
    return NextResponse.json(
      { error: "Failed to review application" },
      { status: 500 }
    );
  }
}
