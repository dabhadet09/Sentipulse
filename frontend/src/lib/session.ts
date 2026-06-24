import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden: Admin access required");
  }
  return user;
}

export async function requirePremium() {
  const user = await requireAuth();
  if (user.role !== "ADMIN" && user.subscriptionTier !== "PREMIUM") {
    throw new Error("Forbidden: Premium subscription required");
  }
  return user;
}

export async function getDbUser(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      subscriptionTier: true,
      avatar: true,
      bio: true,
      createdAt: true,
    },
  });
}
