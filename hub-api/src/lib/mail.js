const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const config = require("../config");

class Mail {
    constructor() {
        this.name = config.SPACEMAIL_USER_NAME;
        this.user = config.SPACEMAIL_USER;
        this.pass = config.SPACEMAIL_PASS;
        this.transporter = nodemailer.createTransport({
            host: "mail.spacemail.com",
            port: 587,
            secure: false,
            auth: {
                user: this.user,
                pass: this.pass,
            },
        });
    }

    // Reusable HTML template
    generateHTML(title, message, buttonText, buttonLink) {
        return `
<html>
<body style="margin:0;padding:0;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" height="100%" background="http://cdn.ryuatelier.org/email_bkg.jpg" style="background-size:cover;background-position:center;background-repeat:no-repeat;width:100%;height:100vh;">
        <tr>
            <td align="center" valign="middle">
                <table role="presentation" border="0" cellpadding="40" cellspacing="0" width="600" style="background-color:rgba(31,41,55,0.85);border-radius:8px;min-height:400px;">
                    <tr>
                        <td align="center">
                            <!-- Icon -->
                            <svg width="48" height="48" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color:#a78bfa;margin-bottom:16px;">
                                <circle cx="9" cy="10" r="1" fill="currentColor"/>
                                <circle cx="15" cy="10" r="1" fill="currentColor"/>
                                <path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M8 16c1.333-2 6.667-2 8 0" stroke="currentColor"/>
                            </svg>

                            <!-- Title -->
                            <h2 style="font-size:24px;font-weight:600;margin:0 0 12px 0;color:#f3f4f6;">Just Dance Melody Online Hub</h2>

                            <!-- Message -->
                            <p style="font-size:16px;margin:0 0 24px 0;color:#d1d5db;line-height:1.5;">${message}</p>

                            <!-- Button -->
                            ${buttonText && buttonLink ? `
                                <a href="${buttonLink}" style="display:inline-block;padding:12px 24px;background-color:#8b5cf6;color:#ffffff;font-weight:600;text-decoration:none;border-radius:6px;">${buttonText}</a>
                            ` : ''}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
    }

    async sendResetPassword(to, resetLink) {
        return this.sendMail({
            from: `"${this.name}" <${this.user}>`,
            to,
            subject: "Just Dance Melody Online Hub - Reset Your Password",
            html: this.generateHTML(
                "Reset Your Password",
                "Click the button below to reset your password. If you didn't request this, you can ignore this email.",
                "Reset Password",
                resetLink
            ),
        });
    }

    async sendEmailVerification(to, verifyLink) {
        return this.sendMail({
            from: `"${this.name}" <${this.user}>`,
            to,
            subject: "Just Dance Melody Online Hub - Verify Your Email",
            html: this.generateHTML(
                "Verify Your Email",
                "Click the button below to verify your email address and activate your account.",
                "Verify Email",
                verifyLink
            ),
        });
    }

    async sendNotification({ to, type, data = {} }) {
        let subject;
        let templateName;

        switch(type) {
            case "ban":
                subject = "Just Dance Melody Online Hub - You're Banned";
                templateName = "ban";
                break;
            case "unban":
                subject = "Just Dance Melody Online Hub - You're Unbanned";
                templateName = "unban";
                break;
            case "delete":
                subject = "Just Dance Melody Online Hub - Your Account Was Deleted";
                templateName = "delete";
                break;
            case "unlink":
                subject = "Just Dance Melody Online Hub - Your Profile Was Unlinked from Your Account";
                templateName = "unlink";
                break;
            default:
                subject = "Just Dance Melody Online Hub - Notification";
                templateName = "default";
        }

        const text = this.loadTemplate(templateName, data);

        return this.sendMail({
            from: `"${this.name}" <${this.user}>`,
            to,
            subject,
            text, // use plain text here
        });
    }

    async sendMail({ from, to, subject, html, text }) {
        const mailOptions = { from, to, subject };
        if (html) mailOptions.html = html;
        if (text) mailOptions.text = text;

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log("Email sent:", info.response);
            return info;
        } catch (error) {
            console.error("Error sending email:", error);
            throw error;
        }
    }

    loadTemplate(templateName, variables = {}) {
        const filePath = path.join(__dirname, "templates", `${templateName}.txt`);
        let content = fs.readFileSync(filePath, "utf8");
        for (const [key, value] of Object.entries(variables)) {
            content = content.replace(new RegExp(`{{${key}}}`, "g"), value);
        }
        // Ensure line breaks are preserved
        return content.replace(/\r?\n/g, "\r\n");
    }
}

module.exports = Mail;
