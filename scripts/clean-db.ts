import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning test database...");
  await prisma.klaimItem.deleteMany();
  await prisma.splitParticipant.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.item.deleteMany();
  await prisma.nota.deleteMany();
  await prisma.notifikasi.deleteMany();
  await prisma.otp.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  console.log("✓ Test database cleaned successfully!");
}

main()
  .catch((e) => {
    console.error("Failed to clean database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
