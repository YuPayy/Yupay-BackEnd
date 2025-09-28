import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;
export const addFriendService = async (userId: number, targetUserId: number) => {
    return prisma.friendship.create({
        data: {
            user_id: userId,
            friend_id: targetUserId,
            status: "PENDING",
        },
    });
};

// Unfriend (hapus pertemanan dua arah)
export const unfriendService = async (userId: number, targetUserId: number) => {
    return prisma.friendship.deleteMany({
        where: {
            OR: [
                { user_id: userId, friend_id: targetUserId },
                { user_id: targetUserId, friend_id: userId }
            ]
        }
    });
};


export const confirmFriendService = async (userId: number, friendId: number) => {
    return prisma.friendship.updateMany({
        where: {
            user_id: friendId,
            friend_id: userId,
            status: "PENDING",
        },
        data: {
            status: "ACCEPTED",
        },
    });
};

export const searchFriendService = async ({
                                              userId,
                                              username,
                                              email,
                                          }: {
    userId?: number;
    username?: string;
    email?: string;
}) => {
    return prisma.user.findFirst({
        where: {
            OR: [
                userId ? { user_id: userId } : null,
                username ? { username: { contains: username } } : null,
                email ? { email: { contains: email } } : null,
            ].filter(Boolean) as any, // <-- kasih as any biar aman ke Prisma
        },
    });
};


// Daftar teman
export const listFriendsService = async (userId: number) => {
    return await prisma.friendship.findMany({
        where: { user_id: userId, status: "accepted" },
        include: {
            friend: {
                select: {
                    user_id: true,
                    username: true,
                    email: true
                }
            }
        }
    });
};

export const listPendingFriendsService = async (userId: number) => {
    return prisma.friendship.findMany({
        where: {
            friend_id: userId,
            status: "PENDING"
        },
        include: {
            user: {
                select: {
                    user_id: true,
                    username: true,
                    email: true
                }
            }
        }
    });
};
