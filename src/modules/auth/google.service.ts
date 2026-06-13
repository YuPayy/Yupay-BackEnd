import { PrismaClient } from "@prisma/client";
import { Profile } from "passport-google-oauth20";

const prisma = new PrismaClient();

export const findOrCreateGoogleUser = async (profile: Profile) => {
    const email = profile.emails?.[0]?.value;
    if (!email) throw new Error("No email found from Google profile");

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        user = await prisma.user.create({
            data: {
                username: profile.displayName.replace(/\s/g, "") + "_" + profile.id.slice(-4),
                email,
                passwordHash: "GOOGLE_OAUTH", // Dummy value, not used for Google login
            },
        });
    }

    return {
        user_id: user.user_id,
        email: user.email,
        displayName: profile.displayName,
        photo: profile.photos?.[0]?.value,
        provider: "google",
    };
};

