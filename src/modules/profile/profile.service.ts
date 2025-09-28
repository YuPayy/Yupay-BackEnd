import { PrismaClient } from "@prisma/client";
import { CreateProfileInput } from "./profile.schema";

const prisma = new PrismaClient();

export const ProfileService = {
    async createProfile(data: CreateProfileInput) {
        return prisma.profile.create({ data });
    },

    async getProfileByUserId(userId: number) {
        return prisma.profile.findUnique({ where: { userId } });
    },

    async updateProfileByUserId(userId: number, data: { name?: string; image?: string; username: string }) {
        return prisma.profile.update({
            where: { userId },
            data,
        });
    },

    async getAllProfiles() {
        return prisma.profile.findMany();
    },
};
