const crypto = require("crypto");
const SessionModel = require("./models/session");

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
// removed confusing chars: I, O, 0, 1

function randomCode(length = 8) {
    let result = "";

    const bytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
        result += CHARSET[bytes[i] % CHARSET.length];
    }

    return `${result.slice(0, 4)}-${result.slice(4, 8)}`;
}

const generateVerifyCode = async () => {
    const maxAttempts = 10;

    for (let i = 0; i < maxAttempts; i++) {
        const code = randomCode();

        // Make sure the code isn't being used by another session
        const exists = await SessionModel.exists({
            verifyCode: code,
            expiration: { $gt: new Date() }
        });

        if (!exists) return code;
    };

    throw new Error("Failed to generate unique verify code");
};

module.exports = {
    generateVerifyCode
};