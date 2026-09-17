// lib/auth-utils.js
const bcrypt = require("bcrypt");
const uuidv4 = require("uuid").v4;
const Mail = require("./mail");
const utils = require("./utils");
const User = require("./models/user");

const generateToken = () => {
    const now = Date.now();
    const expiration = now + 60 * 60 * 1000; // 1 hour
    return `${uuidv4()}:${now}:${expiration}`;
};

const sendVerificationEmail = async (user, endpoint) => {
    const token = generateToken();
    user.status.emailVerificationSentDate = Date.now();
    user.status.emailVerificationToken = token;
    await user.save();

    const base64Encoded = Buffer.from(JSON.stringify({
        t: token,
        uid: user.userId,
        e: user.email
    })).toString("base64");

    const mail = new Mail();
    await mail.sendEmailVerification(user.email, `${utils.getFqdn()}/auth/v1/${endpoint}?token=${base64Encoded}`);
};

const sendResetPasswordEmail = async (user) => {
    const token = generateToken();
    user.status.passwordUpdateRequired = true;
    user.status.passwordUpdateToken = token;
    user.status.passwordResetSentDate = Date.now();
    await user.save();

    const base64Encoded = Buffer.from(JSON.stringify({
        t: token,
        e: user.email
    })).toString("base64");

    const mail = new Mail();
    await mail.sendResetPassword(user.email, `${utils.getFqdn()}/auth/v1/reset-password?token=${base64Encoded}`);
};

module.exports = { generateToken, sendVerificationEmail, sendResetPasswordEmail };