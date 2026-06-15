import { PrismaClient } from "@prisma/client";
import { CreateNotifikasiInput, UpdateNotifikasiInput } from "./notifikasi.schema";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const notifikasiService = {
    findAll: async (userId: number) => {
        return prisma.notifikasi.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    },

    findById: async (id: number, userId: number) => {
        return prisma.notifikasi.findFirst({
            where: { id, userId },
        });
    },

    create: async (userId: number, payload: CreateNotifikasiInput) => {
        return prisma.notifikasi.create({
            data: {
                userId,
                title: payload.title,
                message: payload.message,
                isRead: payload.isRead ?? false,
            },
        });
    },

    update: async (id: number, userId: number, payload: UpdateNotifikasiInput) => {
        const existing = await prisma.notifikasi.findFirst({ where: { id, userId } });
        if (!existing) return null;
        return prisma.notifikasi.update({
            where: { id },
            data: payload,
        });
    },

    remove: async (id: number, userId: number) => {
        const existing = await prisma.notifikasi.findFirst({ where: { id, userId } });
        if (!existing) return false;
        await prisma.notifikasi.delete({ where: { id } });
        return true;
    },

    createReminder: async (userId: number, title: string, message: string) => {
        return prisma.notifikasi.create({
            data: {
                userId,
                title,
                message,
                isRead: false,
            },
        });
    },
};
