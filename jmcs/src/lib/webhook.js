import config from "../config";
import utils from "./utils";
const EMERGENCY_ROLE_ID = "1504542488952832113";
export const send = async (payload) => {
    if (!config.DISCORD_WEBHOOK_URL) {
        return;
    }
    // Shouldn't work on local env
    if (utils.isLocal())
        return;
    try {
        const response = await fetch(config.DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...payload,
                content: payload.content ? `<@&${EMERGENCY_ROLE_ID}>\n${payload.content}` : `<@&${EMERGENCY_ROLE_ID}>`,
                username: payload.username ?? `JMCS ${config.ENV.toUpperCase()}`,
            }),
        });
        if (!response.ok) {
            console.error(`Webhook failed with status ${response.status}: ${await response.text()}`);
        }
    }
    catch (err) {
        console.error("webhook.send: failed to send webhook", err);
    }
};
export const cheat = (message, details = {}) => {
    const { pid, score, mapName, sku } = details;
    return send({
        embeds: [{
                title: "🚨 Cheat Detected",
                description: message,
                color: 0xff0000,
                fields: [
                    pid !== undefined ? { name: "PID", value: String(pid), inline: true } : null,
                    score !== undefined ? { name: "Score", value: String(score), inline: true } : null,
                    mapName !== undefined ? { name: "Map", value: String(mapName), inline: true } : null,
                    sku !== undefined ? { name: "SKU", value: String(sku), inline: true } : null,
                ].filter(Boolean),
                timestamp: new Date().toISOString()
            }]
    });
};
export const environmentMismatch = (details) => {
    return ticket({
        title: "⚠️ JMCS Environment Mismatch",
        ...details,
        message: `Ticket Env: \`${details.ticketEnv}\` | Current Env: \`${details.currentEnv}\``,
        color: 0xffa500 // Orange
    });
};
export const ticket = (details) => {
    const { title = "🎫 Ticket Error", ip, originalUrl, message, userId, profileId, color = 0xeeeeee } = details;
    return send({
        embeds: [{
                title,
                description: message,
                color,
                fields: [
                    { name: "IP", value: ip, inline: true },
                    { name: "URL", value: `\`${originalUrl}\``, inline: true },
                    userId !== undefined ? { name: "User ID", value: String(userId), inline: true } : null,
                    profileId !== undefined ? { name: "Profile ID", value: String(profileId), inline: true } : null
                ].filter(Boolean),
                timestamp: new Date().toISOString()
            }]
    });
};
export const sku = (details) => {
    const { title = "🛍️ SKU Error", ip, skuId, message, appId, skuAppId, color = 0x3498db } = details;
    return send({
        embeds: [{
                title,
                description: message,
                color,
                fields: [
                    { name: "IP", value: ip, inline: true },
                    { name: "SKU ID", value: `\`${skuId}\``, inline: true },
                    appId !== undefined ? { name: "App ID", value: String(appId), inline: true } : null,
                    skuAppId !== undefined ? { name: "SKU App ID", value: String(skuAppId), inline: true } : null
                ].filter(Boolean),
                timestamp: new Date().toISOString()
            }]
    });
};
