import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * GET /api/notifications
 * Aggregates the current user's recent activity log entries and the latest
 * premium application status into a unified notifications feed.
 *
 * Returns:
 *  - notifications: chronological list (most recent first), max 20
 *  - unreadCount:   count of notifications newer than 24h (used for the
 *                   bell badge — simple heuristic, no persistence)
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pull last 20 activity log entries for this user
    const [activities, latestApp] = await Promise.all([
      db.activityLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          action: true,
          detail: true,
          createdAt: true,
        },
      }),
      db.premiumApplication.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          platform: true,
          adminNote: true,
          createdAt: true,
          reviewedAt: true,
        },
      }),
    ]);

    type Notification = {
      id: string;
      type: "activity" | "premium";
      icon: string;
      title: string;
      detail: string | null;
      createdAt: string;
      status?: string;
    };

    const notifications: Notification[] = activities.map((a) => ({
      id: a.id,
      type: "activity" as const,
      icon: a.action,
      title: actionLabel(a.action),
      detail: a.detail,
      createdAt: a.createdAt.toISOString(),
    }));

    // If user has a premium application, surface its latest status as a
    // dedicated notification (prepended so it appears at the top).
    if (latestApp) {
      const isReviewed = latestApp.status !== "PENDING";
      notifications.unshift({
        id: `premium-${latestApp.id}`,
        type: "premium",
        icon: "premium",
        title:
          latestApp.status === "APPROVED"
            ? "Premium access approved"
            : latestApp.status === "REJECTED"
              ? "Premium application rejected"
              : "Premium application under review",
        detail:
          latestApp.status === "APPROVED"
            ? "You now have access to live stream analysis and advanced features."
            : latestApp.status === "REJECTED"
              ? latestApp.adminNote || "Contact admin for more details."
              : "Your application is being reviewed by the admin team.",
        createdAt: (
          isReviewed && latestApp.reviewedAt
            ? latestApp.reviewedAt
            : latestApp.createdAt
        ).toISOString(),
        status: latestApp.status,
      });
    }

    // Sort by createdAt desc
    notifications.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Unread heuristic: notifications from the last 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const unreadCount = notifications.filter(
      (n) => new Date(n.createdAt).getTime() > cutoff
    ).length;

    return NextResponse.json({
      notifications: notifications.slice(0, 20),
      unreadCount: Math.min(unreadCount, 9), // cap badge at 9+
    });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    login: "Signed in",
    register: "Account created",
    analysis: "New analysis completed",
    analysis_created: "New analysis completed",
    apply_premium: "Premium application submitted",
    premium_submitted: "Premium application submitted",
    premium_approved: "Premium access approved",
    premium_rejected: "Premium application rejected",
    download_report: "Downloaded a PDF report",
    profile_updated: "Profile updated",
    delete_analysis: "Analysis deleted",
    livestream_segment: "Live stream segment analyzed",
  };
  return map[action] || action.replace(/_/g, " ");
}
