import { PrismaClient } from "@prisma/client";
import { CreateProfileInput } from "./profile.schema";

const prisma = new PrismaClient();

export const ProfileService = {
    async createProfile(data: CreateProfileInput) {
        return prisma.profile.create({
            data,
            select: {
                id: true,
                username: true,
                name: true,
                image: true,
                userId: true,
                createdAt: true,
                updatedAt: true,
            }
        });
    },

    async getProfileByUserId(userId: number) {
        return prisma.profile.findUnique({
            where: { userId },
            select: {
                id: true,
                username: true,
                name: true,
                image: true,
                userId: true,
                createdAt: true,
                updatedAt: true,
            }
        });
    },

    async updateProfileByUserId(userId: number, data: { name?: string; image?: string; username: string }) {
        return prisma.profile.update({
            where: { userId },
            data,
            select: {
                id: true,
                username: true,
                name: true,
                image: true,
                userId: true,
                createdAt: true,
                updatedAt: true,
            }
        });
    },

    async getAllProfiles() {
        return prisma.profile.findMany({
            select: {
                id: true,
                username: true,
                name: true,
                image: true,
                userId: true,
                createdAt: true,
                updatedAt: true,
            }
        });
    },
};

export async function uploadQrisService(userId: number, qrisUrl: string) {
    const user = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!user) throw new Error("User not found");
    if (user.qrisCode) throw new Error("QRIS already uploaded. Use PUT to update.");

    return prisma.user.update({
        where: { user_id: userId },
        data: { qrisCode: qrisUrl }
    });
}

export async function editQrisService(userId: number, qrisUrl: string) {
    const user = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!user) throw new Error("User not found");
    if (!user.qrisCode) throw new Error("QRIS not found. Use POST to upload first.");

    return prisma.user.update({
        where: { user_id: userId },
        data: { qrisCode: qrisUrl }
    });
}

export async function deleteQrisService(userId: number) {
    const user = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!user) throw new Error("User not found");
    if (!user.qrisCode) throw new Error("QRIS not found.");

    return prisma.user.update({
        where: { user_id: userId },
        data: { qrisCode: null }
    });
}

export async function getUserQris(userId: number) {
    return prisma.user.findUnique({
        where: { user_id: userId },
        select: {
            user_id: true,
            username: true,
            email: true,
            qrisCode: true,
        }
    });
}
