const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: "admin@group38.edu" },
  });

  if (existing) {
    console.log("Admin account already exists");
    return;
  }

  const hashed = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Group 38 Admin",
      email: "admin@group38.edu",
      password: hashed,
      role: "ADMIN",
      subscriptionTier: "PREMIUM",
      bio: "System Administrator - Group No 38",
    },
  });
  console.log("Admin account seeded: ", admin.email);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
