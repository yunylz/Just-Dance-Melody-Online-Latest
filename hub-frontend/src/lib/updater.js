import { isTauri } from '$lib/tauri.js';

/**
 * Demo mode for testing the update UI without a real update.
 * Enable by opening the app with `?demoUpdate=1` or setting localStorage
 * `demoUpdate = '1'`, then reload. The banner will show a fake v999.0.0
 * update and simulate download/install progress.
 */
const isDemoUpdate = () =>
	(typeof window !== 'undefined' &&
		new URLSearchParams(window.location.search).get('demoUpdate') === '1') ||
	localStorage.getItem('demoUpdate') === '1';

/**
 * Check for a desktop app update via the Tauri updater plugin.
 * No-ops (returns null) on the web, or returns a fake update in demo mode.
 *
 * @returns {Promise<object|null>} The Update object, or null if none / web.
 */
export async function checkForUpdate() {
	if (!isTauri()) return null;
	if (isDemoUpdate()) {
		console.warn('UpdateBanner: demo mode — showing fake update');
		return {
			version: '999.0.0',
			date: new Date().toISOString(),
			body: 'Demo update for UI testing.',
			async downloadAndInstall(onProgress) {
				const total = 50 * 1024 * 1024; // 50 MB fake
				let downloaded = 0;
				onProgress?.({ event: 'Started', data: { contentLength: total } });
				for (let i = 0; i <= 20; i++) {
					await new Promise((r) => setTimeout(r, 200));
					downloaded = Math.floor((total / 20) * i);
					onProgress?.({ event: 'Progress', data: { chunkLength: downloaded } });
				}
				onProgress?.({ event: 'Finished', data: {} });
				// Demo: don't actually relaunch.
			}
		};
	}

	try {
		const { check } = await import('@tauri-apps/plugin-updater');
		return await check();
	} catch (e) {
		console.error('Update check failed:', e);
		return null;
	}
}

/**
 * Download + install an update, reporting progress, then relaunch the app.
 * @param {object} update - The Update object returned by checkForUpdate().
 * @param {(p: {downloaded:number, contentLength:number}) => void} [onProgress]
 * @returns {Promise<boolean>} Resolves true once relaunch is triggered.
 */
export async function installUpdate(update, onProgress) {
	if (!update) return false;

	try {
		let downloaded = 0;
		let contentLength = 0;

		await update.downloadAndInstall((event) => {
			switch (event.event) {
				case 'Started':
					contentLength = event.data.contentLength;
					break;
				case 'Progress':
					downloaded += event.data.chunkLength;
					break;
				case 'Finished':
					break;
			}
			onProgress?.({ downloaded, contentLength });
		});

		const { relaunch } = await import('@tauri-apps/plugin-process');
		await relaunch();
		return true;
	} catch (e) {
		console.error('Update install failed:', e);
		throw e;
	}
}
