import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const GroupService = {
    async createGroup(userId: number, title: string, description?: string) {
        return prisma.nota.create({
            data: {
                payer_id: userId,
                tanggalTransaksi: new Date(),
                totalHarga: 0,
                status: "open",
                items: { create: [] },
            },
        });
    },

    async inviteUserToGroup(groupId: number, userId: number, friendId: number) {
        const group = await prisma.nota.findUnique({ where: { nota_id: groupId } });
        if (!group) throw new Error("Group tidak ditemukan");

        if (group.payer_id !== userId) throw new Error("Hanya owner yang bisa menginvite");

        return prisma.splitParticipant.create({
            data: {
                nota_id: groupId,
                user_id: friendId,
                statusKlaim: "pending",
            },
        });
    },

    async getUserInvites(userId: number) {
        return prisma.splitParticipant.findMany({
            where: { user_id: userId, statusKlaim: "pending" },
            include: { nota: true },
        });
    },

    async respondInvite(groupId: number, userId: number, status: "accepted" | "rejected") {
        return prisma.splitParticipant.updateMany({
            where: { nota_id: groupId, user_id: userId },
            data: { statusKlaim: status },
        });
    },
};
