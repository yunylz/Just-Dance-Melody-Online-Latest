// CDN that serves the S3 `jdmo-builds` bucket (where the release workflow
// uploads the Tauri updater manifest at /hub/latest.json).
const CDN_BASE = process.env.CDN_BASE || "https://jdmo-builds-cdn.c0llydoll.dev";

// Apps that publish a Tauri updater manifest to the CDN.
const SUPPORTED_APPS = ["hub-desktop"];

/**
 * Fetch the latest release manifest for an app from the CDN.
 *
 * The release workflow uploads a Tauri updater `latest.json` to
 * `/hub/latest.json` on S3, served here as `{CDN_BASE}/hub/latest.json`.
 * The manifest is already in the format the Tauri updater expects
 * (`version`, `notes`, `pub_date`, `platforms.{target}.{signature,url}`),
 * so it is returned as-is.
 *
 * @param {string} appName
 * @returns {Promise<object>} the Tauri updater manifest
 */
const getLatestRelease = async (appName) => {
    if (!SUPPORTED_APPS.includes(appName)) {
        const error = new Error(`Unknown app: ${appName}`);
        error.status = 404;
        throw error;
    }

    const response = await fetch(`${CDN_BASE}/hub/latest.json`);

    if (!response.ok) {
        const error = new Error(`CDN request failed with status ${response.status}`);
        error.status = response.status;
        throw error;
    }

    return response.json();
};

module.exports = {
    getLatestRelease,
    CDN_BASE,
    SUPPORTED_APPS
};
