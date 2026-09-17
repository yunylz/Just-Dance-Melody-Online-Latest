/**
 * JDMO Launcher service — implemented in JS using Tauri v2 plugins.
 *
 * Replaces the old Python launcher (jdmo-launcher). Downloads games from the
 * CDN manifest, verifies MD5, tracks install state, and launches games with
 * the account auth file. Only usable inside the Tauri desktop app.
 *
 * Plugins used:
 *   - @tauri-apps/plugin-http   (CORS-free downloads)
 *   - @tauri-apps/plugin-fs     (file access on disk)
 *   - @tauri-apps/plugin-shell  (launching the game executable)
 *   - @tauri-apps/plugin-dialog (folder picker)
 *   - @tauri-apps/api/path      (app data dir, join, dirname)
 */

import { writable } from 'svelte/store';
import { isTauri } from '$lib/tauri.js';
import { appDataDir, join, dirname } from '@tauri-apps/api/path';
import { open, mkdir, remove, exists, writeTextFile, readDir, stat } from '@tauri-apps/plugin-fs';
import { Command } from '@tauri-apps/plugin-shell';
import { fetch } from '@tauri-apps/plugin-http';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import SparkMD5 from 'spark-md5';

export const CDN_BASE = 'https://jdmo-cdn.c0llydoll.com';

export const AVAILABLE_GAMES = [
	{
		id: 'jd2017',
		name: 'Just Dance Melody Online',
		version: 2017,
		description: 'Experience the JDMO experience right on your PC!',
		platforms: ['pc'],
		size_mb: 2048,
		executable: 'JD2017.exe'
	}
];

const CONFIG_KEY = 'launcher.config';

/**
 * Live download progress. Components subscribe to this store.
 * Shape: { gameId, file, downloaded, total, speed, finished, error }
 */
export const downloadProgress = writable({
	gameId: null,
	file: '',
	downloaded: 0,
	total: 0,
	speed: 0,
	finished: false,
	error: null
});

/**
 * Live uninstall progress. Components subscribe to this store.
 * Shape: { gameId, done, total, finished, error }
 */
export const uninstallProgress = writable({
	gameId: null,
	done: 0,
	total: 0,
	finished: false,
	error: null
});

// ── Config (persisted in localStorage) ──────────────────────────────
function loadConfig() {
	try {
		return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {};
	} catch {
		return {};
	}
}

function saveConfig(cfg) {
	try {
		localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
	} catch (e) {
		console.error('Failed to save launcher config:', e);
	}
}

async function defaultGamesDir() {
	return join(await appDataDir(), 'games');
}

async function gamesDir() {
	const cfg = loadConfig();
	return cfg.downloadPath || (await defaultGamesDir());
}

/**
 * Resolve where a game actually lives on disk: a user-located folder
 * (via "locate game") takes priority, otherwise the default games dir.
 * Returns null if the game isn't on disk.
 */
async function existsSafe(p) {
	try {
		return await exists(p);
	} catch {
		return false;
	}
}

async function resolveGameDir(gameId) {
	const cfg = loadConfig();
	const custom = cfg.installPath?.[gameId];
	if (custom && (await existsSafe(custom))) return custom;
	const def = await join(await gamesDir(), gameId);
	if (await existsSafe(def)) return def;
	return null;
}

function setProgress(gameId, file, downloaded, total, speed, finished, error) {
	downloadProgress.set({ gameId, file, downloaded, total, speed, finished, error });
}

// ── MD5 helpers ─────────────────────────────────────────────────────
async function fileMd5(path) {
	const f = await open(path, { read: true });
	const spark = new SparkMD5.ArrayBuffer();
	const buf = new Uint8Array(1024 * 1024);
	let n;
	while ((n = await f.read(buf)) > 0) {
		spark.append(buf.buffer.slice(0, n));
	}
	await f.close();
	return spark.end();
}

// ── Info ─────────────────────────────────────────────────────────────
export async function getGames() {
	const dir = await gamesDir();
	const cfg = loadConfig();
	const installed = cfg.installed || {};
	const installPath = cfg.installPath || {};
	const results = [];

	for (const info of AVAILABLE_GAMES) {
		// Locate user-pointed installs first, else the default download dir
		const custom = installPath[info.id];
		let resolvedPath = null;
		let located = false;
		if (custom && (await existsSafe(custom))) {
			resolvedPath = custom;
			located = true;
		} else {
			const defaultPath = await join(dir, info.id);
			if (await existsSafe(defaultPath)) {
				resolvedPath = defaultPath;
			}
		}

		// Real download size from the CDN manifest (fallback to placeholder)
		let totalSize = null;
		try {
			totalSize = manifestSize(await getManifest(info.id));
		} catch (e) {
			console.error(`Failed to fetch manifest for ${info.id}:`, e);
			totalSize = info.size_mb ? info.size_mb * 1024 * 1024 : null;
		}

		results.push({
			...info,
			totalSize,
			installed: !!resolvedPath,
			located,
			installPath: resolvedPath,
			installed_version: located ? 'located' : installed[info.id]?.version || null,
			running: false
		});
	}

	// Prune stale metadata (folders deleted/moved)
	let changed = false;
	for (const id of Object.keys(installed)) {
		if (!(await resolveGameDir(id))) {
			delete installed[id];
			changed = true;
		}
	}
	for (const id of Object.keys(installPath)) {
		if (!(await existsSafe(installPath[id]))) {
			delete installPath[id];
			changed = true;
		}
	}
	if (changed) saveConfig({ ...cfg, installed, installPath });
	return results;
}

export async function getDownloadPath() {
	const cfg = loadConfig();
	return cfg.downloadPath || (await defaultGamesDir());
}

export async function setDownloadPath(path) {
	await mkdir(path, { recursive: true });
	const cfg = loadConfig();
	cfg.downloadPath = path;
	saveConfig(cfg);
}

/**
 * Free bytes available on the filesystem containing `path`.
 * Requires the native `free_space` command.
 */
export async function getFreeSpace(path) {
	const { invoke } = await import('@tauri-apps/api/core');
	return invoke('free_space', { path });
}

/** Fetch a game's CDN manifest (version, files, sizes) with a timeout. */
export async function getManifest(gameId) {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), 8000);
	try {
		const res = await fetch(`${CDN_BASE}/public/builds/${gameId}/latest.json`, {
			signal: ctrl.signal
		});
		if (!res.ok) throw new Error(`Manifest HTTP ${res.status}`);
		return await res.json();
	} finally {
		clearTimeout(t);
	}
}

/** Total download size in bytes for a game manifest. */
export function manifestSize(manifest) {
	return (manifest.files || []).reduce((sum, e) => sum + (e.size || 0), 0);
}

/**
 * Fast update check for an installed game: compares each manifest file's
 * existence + size against disk (no full hashing). Returns how many files
 * are missing/mismatched so the UI can force an update.
 */
export async function checkGameUpdates(gameId) {
	const dir = await resolveGameDir(gameId);
	if (!dir) {
		return { installed: false, needsUpdate: false, filesToDownload: 0, totalFiles: 0, version: null };
	}

	let manifest = null;
	try {
		manifest = await getManifest(gameId);
	} catch (e) {
		console.error('checkGameUpdates: failed to fetch manifest', e);
		return { installed: true, needsUpdate: false, filesToDownload: 0, totalFiles: 0, version: null };
	}

	const files = manifest.files || [];
	let missing = 0;
	for (const entry of files) {
		const local = await join(dir, entry.path);
		let ok = false;
		if (await existsSafe(local)) {
			if (entry.size) {
				try {
					const st = await stat(local);
					ok = st.size === entry.size;
				} catch {
					ok = false;
				}
			} else {
				ok = true;
			}
		}
		if (!ok) missing++;
	}

	return {
		installed: true,
		needsUpdate: missing > 0,
		filesToDownload: missing,
		totalFiles: files.length,
		version: manifest.version || null
	};
}

// ── Download / update ────────────────────────────────────────────────
export async function downloadGame(gameId) {
	const info = AVAILABLE_GAMES.find((g) => g.id === gameId);
	if (!info) throw new Error(`Unknown game: ${gameId}`);

	// Download into the existing install if there is one (updates), else default dir
	const existing = await resolveGameDir(gameId);
	const gamePath = existing || (await join(await gamesDir(), gameId));
	await mkdir(gamePath, { recursive: true });

	// 1. Fetch remote manifest
	setProgress(gameId, 'checking', 0, 0, 0, false, null);
	const manifestRes = await fetch(`${CDN_BASE}/public/builds/${gameId}/latest.json`);
	if (!manifestRes.ok) throw new Error(`Failed to fetch manifest (${manifestRes.status})`);
	const manifest = await manifestRes.json();
	const files = manifest.files || [];
	const version = manifest.version || 'unknown';

	// 2. Determine which files need downloading (skip MD5-matching local files)
	const toDownload = [];
	for (const entry of files) {
		const rel = entry.path;
		const local = await join(gamePath, rel);
		const expected = entry.md5 || '';
		if (expected && (await exists(local)) && (await fileMd5(local)) === expected) continue;
		toDownload.push(entry);
	}

	const totalBytes = toDownload.reduce((sum, e) => sum + (e.size || 0), 0);
	let downloadedBytes = 0;
	const start = Date.now();

	for (const entry of toDownload) {
		const rel = entry.path;
		const local = await join(gamePath, rel);
		await mkdir(await dirname(local), { recursive: true });

		const resp = await fetch(`${CDN_BASE}/public/builds/${gameId}/${rel}`);
		if (!resp.ok) throw new Error(`Failed to download ${rel} (${resp.status})`);

		const out = await open(local, { write: true, create: true, truncate: true });
		const reader = resp.body.getReader();
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) {
				await out.write(value);
				downloadedBytes += value.length;
				const elapsed = (Date.now() - start) / 1000;
				const speed = elapsed > 0 ? downloadedBytes / elapsed / (1024 * 1024) : 0;
				setProgress(gameId, rel, downloadedBytes, totalBytes, speed, false, null);
			}
		}
		await out.close();

		// Verify MD5 after download
		if (entry.md5 && (await fileMd5(local)) !== entry.md5) {
			await remove(local).catch(() => {});
			throw new Error(`MD5 mismatch for ${rel}`);
		}
	}

	// 3. Save manifest + mark installed
	const cfg = loadConfig();
	cfg.installed = cfg.installed || {};
	cfg.installed[gameId] = { version, lastPlayed: null };
	saveConfig(cfg);

	setProgress(gameId, 'done', totalBytes, totalBytes, 0, true, null);
}

// ── Launch / locate / delete / reveal ────────────────────────────────
export async function launchGame(gameId, api) {
	const info = AVAILABLE_GAMES.find((g) => g.id === gameId);
	if (!info) throw new Error(`Unknown game: ${gameId}`);

	const gamePath = await resolveGameDir(gameId);
	if (!gamePath) throw new Error('Game is not installed');

	// Write the account auth file
	const authFile = await api.getAuthFile();
	await writeTextFile(await join(gamePath, 'account.ini'), authFile);

	// Record last played
	const cfg = loadConfig();
	cfg.installed = cfg.installed || {};
	cfg.installed[gameId] = {
		...(cfg.installed[gameId] || {}),
		lastPlayed: new Date().toISOString()
	};
	saveConfig(cfg);

	// Launch — wine on macOS, direct exe elsewhere.
	// The shell scope matches `name` by exact string, so direct-exe launches
	// use the fixed alias `run-jd2017` (whose `cmd` resolves to the standard
	// install location). On macOS the game path is passed as a wine argument,
	// so any located path works.
	const exePath = await join(gamePath, info.executable);
	const isMac = /Mac/i.test(navigator.userAgent || '');
	const command = isMac
		? Command.create('wine', [exePath], { cwd: gamePath })
		: Command.create('run-jd2017', [], { cwd: gamePath });

	await command.spawn();
}

/**
 * Point the launcher at an already-installed game folder on disk.
 * Validates the game executable exists, then remembers the location.
 * @returns {Promise<string|null>} the chosen folder, or null if cancelled
 */
export async function locateGame(gameId) {
	const info = AVAILABLE_GAMES.find((g) => g.id === gameId);
	if (!info) throw new Error(`Unknown game: ${gameId}`);

	const folder = await openDialog({
		title: `Locate ${info.name}`,
		directory: true,
		canCreateDirectories: false
	});
	if (!folder) return null;

	// Validate the game executable is actually in the chosen folder
	const exePath = await join(folder, info.executable);
	if (!(await exists(exePath))) {
		throw new Error(`${info.executable} was not found in that folder`);
	}

	const cfg = loadConfig();
	cfg.installPath = cfg.installPath || {};
	cfg.installPath[gameId] = folder;
	cfg.installed = cfg.installed || {};
	cfg.installed[gameId] = { version: 'located', lastPlayed: null };
	saveConfig(cfg);
	return folder;
}

/** Remove a located game from the launcher WITHOUT deleting its files. */
export async function forgetGame(gameId) {
	const cfg = loadConfig();
	if (cfg.installPath) delete cfg.installPath[gameId];
	if (cfg.installed) delete cfg.installed[gameId];
	saveConfig(cfg);
}

/** Recursively collect every file under a directory (not the dirs themselves). */
async function collectFiles(dir, out) {
	for (const entry of await readDir(dir)) {
		const p = await join(dir, entry.name);
		if (entry.isDirectory()) {
			await collectFiles(p, out);
		} else {
			out.push(p);
		}
	}
}

/** Delete a directory tree, emitting per-file progress to uninstallProgress. */
async function deleteDirWithProgress(gameId, dir) {
	uninstallProgress.set({ gameId, done: 0, total: 0, finished: false, error: null });

	const files = [];
	await collectFiles(dir, files);
	uninstallProgress.set({ gameId, done: 0, total: files.length, finished: false, error: null });

	let done = 0;
	for (const p of files) {
		try {
			await remove(p);
		} catch (e) {
			console.error('Failed to remove', p, e);
		}
		done++;
		uninstallProgress.set({ gameId, done, total: files.length, finished: false, error: null });
	}

	// Remove the now-empty directory tree
	try {
		await remove(dir, { recursive: true });
	} catch (e) {
		console.error('Failed to remove directory', dir, e);
	}
	uninstallProgress.set({ gameId, done: files.length, total: files.length, finished: true, error: null });
}

export async function deleteGame(gameId) {
	const cfg = loadConfig();
	const custom = cfg.installPath?.[gameId];

	if (custom && (await exists(custom))) {
		// Located game — just remove from launcher, keep the user's files
		if (cfg.installPath) delete cfg.installPath[gameId];
	} else {
		// Downloaded by the launcher — delete the files with progress
		const gamePath = await join(await gamesDir(), gameId);
		if (await exists(gamePath)) {
			await deleteDirWithProgress(gameId, gamePath);
		}
	}

	if (cfg.installed) delete cfg.installed[gameId];
	saveConfig(cfg);
}

export async function showInFileManager(gameId) {
	const gamePath = await resolveGameDir(gameId);
	if (!gamePath) throw new Error('Game is not installed');
	await revealItemInDir(gamePath);
}

// ── Namespace (kept for component compatibility) ─────────────────────
export const launcher = {
	available: () => isTauri(),
	getGames,
	getDownloadPath,
	setDownloadPath,
	getFreeSpace,
	getManifest,
	manifestSize,
	downloadGame,
	checkGameUpdates,
	launchGame,
	locateGame,
	forgetGame,
	deleteGame,
	showInFileManager
};
