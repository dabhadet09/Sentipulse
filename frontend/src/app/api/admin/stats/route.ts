import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      totalUsers,
      premiumUsers,
      adminUsers,
      totalAnalyses,
      premiumAnalyses,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      recentActivity,
      freeRoleUsers,
      premiumRoleUsers,
      topUsersRaw,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { subscriptionTier: "PREMIUM" } }),
      db.user.count({ where: { role: "ADMIN" } }),
      db.analysis.count(),
      db.analysis.count({ where: { isPremium: true } }),
      db.premiumApplication.count({ where: { status: "PENDING" } }),
      db.premiumApplication.count({ where: { status: "APPROVED" } }),
      db.premiumApplication.count({ where: { status: "REJECTED" } }),
      db.activityLog.findMany({
        take: 15,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      // Role distribution buckets per task 16-c spec:
      //   free    = tier=FREE and role=USER
      //   premium = tier=PREMIUM (any role)
      //   admin   = role=ADMIN (any tier)
      // Note: buckets are NOT mutually exclusive — a PREMIUM admin would
      // appear in both `premium` and `admin`. In practice the seeded admin
      // uses the default FREE tier so this does not cause double counting.
      db.user.count({
        where: { role: "USER", subscriptionTier: "FREE" },
      }),
      db.user.count({
        where: { subscriptionTier: "PREMIUM" },
      }),
      // Top 5 most active users by analysis count
      db.user.findMany({
        take: 5,
        orderBy: { analyses: { _count: "desc" } },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          subscriptionTier: true,
          _count: { select: { analyses: true } },
        },
      }),
    ]);

    // Platform breakdown
    const platformBreakdown = await db.analysis.groupBy({
      by: ["platform"],
      _count: { _all: true },
    });

    // Sentiment breakdown
    const sentimentBreakdown = await db.analysis.groupBy({
      by: ["overallSentiment"],
      _count: { _all: true },
    });

    // New users per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsers = await db.user.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    const dailyNewUsers: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyNewUsers[key] = 0;
    }
    for (const u of recentUsers) {
      const key = u.createdAt.toISOString().split("T")[0];
      if (key in dailyNewUsers) dailyNewUsers[key]++;
    }

    // Analyses per day (last 7 days)
    const recentAnalyses = await db.analysis.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, platform: true, isPremium: true },
    });

    const dailyAnalyses: Record<
      string,
      { total: number; premium: number; byPlatform: Record<string, number> }
    > = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyAnalyses[key] = { total: 0, premium: 0, byPlatform: {} };
    }
    for (const a of recentAnalyses) {
      const key = a.createdAt.toISOString().split("T")[0];
      if (key in dailyAnalyses) {
        dailyAnalyses[key].total++;
        if (a.isPremium) dailyAnalyses[key].premium++;
        dailyAnalyses[key].byPlatform[a.platform] =
          (dailyAnalyses[key].byPlatform[a.platform] || 0) + 1;
      }
    }

    return NextResponse.json({
      totals: {
        users: totalUsers,
        premiumUsers,
        adminUsers,
        analyses: totalAnalyses,
        premiumAnalyses,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
      },
      platformBreakdown: platformBreakdown.map((p) => ({
        platform: p.platform,
        count: p._count._all,
      })),
      sentimentBreakdown: sentimentBreakdown.map((s) => ({
        sentiment: s.overallSentiment,
        count: s._count._all,
      })),
      dailyNewUsers: Object.entries(dailyNewUsers).map(([date, count]) => ({
        date,
        count,
      })),
      dailyAnalyses: Object.entries(dailyAnalyses).map(([date, v]) => ({
        date,
        total: v.total,
        premium: v.premium,
        byPlatform: v.byPlatform,
      })),
      recentActivity,
      roleDistribution: {
        free: freeRoleUsers,
        premium: premiumRoleUsers,
        admin: adminUsers,
      },
      topActiveUsers: topUsersRaw.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        subscriptionTier: u.subscriptionTier,
        analysisCount: u._count.analyses,
      })),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
