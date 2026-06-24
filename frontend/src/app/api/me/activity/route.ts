import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const ACTION_LABELS: Record<string, string> = {
  login: "Signed in",
  analysis_created: "Completed analysis",
  premium_applied: "Applied for premium",
  profile_updated: "Updated profile",
  account_created: "Account created",
  register: "Account created",
  apply_premium: "Applied for premium",
  download_report: "Downloaded report",
  delete_analysis: "Deleted analysis",
  livestream_segment: "Live stream segment analyzed",
  premium_approved: "Premium approved",
  premium_rejected: "Premium rejected",
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const logs = await db.activityLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        action: true,
        detail: true,
        createdAt: true,
      },
    });

    const activities = logs.map((log) => ({
      id: log.id,
      action: log.action,
      label: ACTION_LABELS[log.action] ?? log.action,
      detail: log.detail,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Fetch activity error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
