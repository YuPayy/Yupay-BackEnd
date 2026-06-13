import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function cleanDatabase() {
  // Delete in reverse dependency order
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
}

export { prisma };
