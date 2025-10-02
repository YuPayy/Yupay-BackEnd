import { Request, Response } from "express";
import { GroupService } from "./group.service";

export const GroupController = {
    async createGroup(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId;
            const { title, description } = req.body;
            const group = await GroupService.createGroup(userId, title, description);
            res.json(group);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async inviteUser(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId;
            const { friendId } = req.body;
            const { groupId } = req.params;

            const invite = await GroupService.inviteUserToGroup(Number(groupId), userId, friendId);
            res.json(invite);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async getUserInvites(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId;
            const invites = await GroupService.getUserInvites(userId);
            res.json(invites);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },

    async respondInvite(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId;
            const { status } = req.body;
            const { groupId } = req.params;

            const result = await GroupService.respondInvite(Number(groupId), userId, status);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    },
};
