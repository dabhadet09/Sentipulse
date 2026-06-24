import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    const lowerEmail = "test3@test.com";
    const hashed = await bcrypt.hash("password123", 10);
    const user = await prisma.user.create({
      data: {
        name: "testuser",
        email: lowerEmail,
        password: hashed,
        role: "USER",
        subscriptionTier: "FREE",
      },
    });
    console.log("User created:", user.id);
    
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "register",
        detail: "New user registration",
      },
    });
    console.log("Activity log created");
  } catch (error) {
    console.error("Prisma error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
