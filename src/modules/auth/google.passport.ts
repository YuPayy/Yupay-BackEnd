import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { findOrCreateGoogleUser } from "./google.service";

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            callbackURL: "/auth/google/callback",
        },
        async (_accessToken, _refreshToken, profile, done) => {
            try {
                const user = await findOrCreateGoogleUser(profile);
                done(null, {
                    ...user,
                    emails: [{ value: user.email }],
                    displayName: user.displayName,
                    photos: [{ value: user.photo }],
                });
            } catch (err) {
                done(err, undefined);
            }
        }
    )
);

passport.serializeUser((user: any, done) => {
    done(null, user);
});

passport.deserializeUser((obj: any, done) => {
    done(null, obj);
});

