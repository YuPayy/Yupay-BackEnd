import nodemailer from "nodemailer";

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

const getTransporter = () => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        throw new Error(
            "Email credentials missing. Set EMAIL_USER and EMAIL_PASS in .env"
        );
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
    });
};

export const sendEmail = async ({
    to,
    subject,
    html,
}: EmailOptions): Promise<void> => {
    if (process.env.NODE_ENV === "test") {
        console.log(`[TEST] Skip sending email to ${to}`);
        return;
    }

    const transporter = getTransporter();
    const from = process.env.EMAIL_USER as string;

    await transporter.sendMail({
        from: `"Yupay" <${from}>`,
        to,
        subject,
        html,
    });
};
