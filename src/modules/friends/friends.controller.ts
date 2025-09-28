import { Request, Response } from "express";
import { addFriendService, confirmFriendService, listFriendsService, searchFriendService, unfriendService } from "./friends.service";

// Add friend
export const addFriendController = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.userId;
        const { targetUserId } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // pastikan targetUserId number
        const targetId = Number(targetUserId);
        if (!targetUserId || isNaN(targetId)) {
            return res.status(400).json({ error: "targetUserId must be a valid number" });
        }
        if (userId === targetId) {
            return res.status(400).json({ error: "You cannot add yourself as a friend" });
        }

        const friendRequest = await addFriendService(userId, targetId);

        res.status(201).json({
            message: "Friend request sent",
            data: friendRequest,
        });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};

// Confirm friend
export const confirmFriendController = async (req: Request, res: Response) => {
    try {
        const { friendId } = req.body;
        const userId = (req.user as any)?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const targetId = Number(friendId);
        if (!friendId || isNaN(targetId)) {
            return res.status(400).json({ error: "friendId must be a valid number" });
        }

        const result = await confirmFriendService(userId, targetId);
        res.status(200).json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};

// Daftar teman
export const listFriendsController = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const friends = await listFriendsService(userId);
        res.status(200).json({ friends });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};

// Search friend by user_id (atau username/email jika ingin)
export const searchFriendController = async (req: Request, res: Response) => {
    try {
        const { userId, username, email } = req.query;

        if (!userId && !username && !email) {
            return res.status(400).json({ error: "Provide userId, username, or email to search" });
        }

        const result = await searchFriendService({
            userId: userId ? Number(userId) : undefined,
            username: username ? String(username) : undefined,
            email: email ? String(email) : undefined,
        });

        if (!result) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({ user: result });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};

export const unfriendController = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.userId;
        const { targetUserId } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const targetId = Number(targetUserId);
        if (!targetUserId || isNaN(targetId)) {
            return res.status(400).json({ error: "targetUserId must be a valid number" });
        }
        if (userId === targetId) {
            return res.status(400).json({ error: "You cannot unfriend yourself" });
        }

        const result = await unfriendService(userId, targetId);

        if (result.count === 0) {
            return res.status(404).json({ error: "Friendship not found" });
        }

        res.status(200).json({ message: "Unfriended successfully" });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};
