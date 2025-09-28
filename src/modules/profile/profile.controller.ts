import { Request, Response } from "express";
import { ProfileService, uploadQrisService, editQrisService, deleteQrisService } from "./profile.service";
import { createProfileSchema, updateProfileSchema } from "./profile.schema";

export const ProfileController = {
    async getProfileByToken(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const profile = await ProfileService.getProfileByUserId(userId);
            if (!profile) return res.status(404).json({ error: "Profile not found" });
            res.json(profile);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.userId;
            const username = (req as any).user?.username;
            if (!userId || !username) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const parsed = createProfileSchema.safeParse({
                ...req.body,
                userId,
                username,
            });
            if (!parsed.success) {
                return res.status(400).json({
                    error: parsed.error.issues.map(e => ({
                        path: e.path,
                        message: e.message
                    }))
                });
            }

            const existingProfile = await ProfileService.getProfileByUserId(userId);
            if (existingProfile) {
                const updatedProfile = await ProfileService.updateProfileByUserId(userId, {
                    name: parsed.data.name,
                    image: parsed.data.image,
                    username
                });
                return res.status(200).json(updatedProfile);
            }

            const profile = await ProfileService.createProfile(parsed.data);
            res.status(201).json(profile);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.userId;
            const username = (req as any).user?.username;
            if (!userId || !username) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const parsed = updateProfileSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({
                    error: parsed.error.issues.map(e => ({
                        path: e.path,
                        message: e.message
                    }))
                });
            }

            const updatedProfile = await ProfileService.updateProfileByUserId(userId, {
                name: parsed.data.name,
                image: parsed.data.image,
                username
            });

            res.json(updatedProfile);
        } catch (err: any) {
            res.status(500).json({ error: "Failed to update profile" });
        }
    },

    async list(req: Request, res: Response) {
        try {
            const profiles = await ProfileService.getAllProfiles();
            res.json(profiles);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    },

    // Upload QRIS image (POST /profile/qris)
    async uploadQrisController(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.userId;
            const { qrisUrl } = req.body;

            if (!userId) return res.status(401).json({ error: "Unauthorized" });
            if (!qrisUrl) return res.status(400).json({ error: "qrisUrl is required" });

            const updated = await uploadQrisService(userId, qrisUrl);

            res.status(201).json({
                message: "QRIS uploaded successfully",
                user: {
                    user_id: updated.user_id,
                    username: updated.username,
                    email: updated.email,
                    qrisCode: updated.qrisCode
                }
            });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    },

    // Edit QRIS image (PUT /profile/qris)
    async editQrisController(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.userId;
            const { qrisUrl } = req.body;

            if (!userId) return res.status(401).json({ error: "Unauthorized" });
            if (!qrisUrl) return res.status(400).json({ error: "qrisUrl is required" });

            const updated = await editQrisService(userId, qrisUrl);

            res.status(200).json({
                message: "QRIS updated successfully",
                user: {
                    user_id: updated.user_id,
                    username: updated.username,
                    email: updated.email,
                    qrisCode: updated.qrisCode
                }
            });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    },

    // Delete QRIS image (DELETE /profile/qris)
    async deleteQrisController(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.userId;

            if (!userId) return res.status(401).json({ error: "Unauthorized" });

            const updated = await deleteQrisService(userId);

            res.status(200).json({
                message: "QRIS deleted successfully",
                user: {
                    user_id: updated.user_id,
                    username: updated.username,
                    email: updated.email,
                    qrisCode: updated.qrisCode
                }
            });
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    },
};
