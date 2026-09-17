/**
 * Generates the Tauri updater `latest.json` manifest from the release artifacts.
 * Used by the GitHub Actions release workflow (uploaded to S3 at /hub/latest.json)
 * and can also be run locally for testing:
 *
 *   APP_VERSION=1.5.6 node scripts/generate-latest-json.mjs ./artifacts
 *
 * Artifacts are expected in per-platform subdirectories (matching what the
 * workflow uploads to S3):
 *   ./artifacts/macos/JDMO.Hub.app.tar.gz + .sig
 *   ./artifacts/nsis/JDMO.Hub_<version>_x64-setup.exe + .sig
 *   ./artifacts/msi/JDMO.Hub_<version>_x64.msi + .sig
 *
 * Platform keys follow the Tauri updater "OS-ARCH" convention:
 *   darwin-aarch64  -> macOS Apple Silicon (updater .tar.gz)
 *   windows-x86_64  -> Windows x64 (NSIS setup exe)
 */
import fs from 'node:fs';
import path from 'node:path';

const version = process.env.APP_VERSION;
const cdnBase = process.env.CDN_BASE || 'https://jdmo-builds-cdn.c0llydoll.dev';
const dir = process.argv[2] || 'artifacts';

if (!version) {
	console.error('APP_VERSION env is required');
	process.exit(1);
}

const readSig = (sub, file) => {
	const p = path.join(dir, sub, `${file}.sig`);
	if (!fs.existsSync(p)) return null;
	return fs.readFileSync(p, 'utf8').trim();
};
const url = (sub, file) => `${cdnBase}/hub/${version}/${sub}/${file}`;

const platforms = {};

// macOS (aarch64) — updater bundle is a .tar.gz of the .app
const macSig = readSig('macos', 'JDMO.Hub.app.tar.gz');
if (macSig) {
	platforms['darwin-aarch64'] = {
		signature: macSig,
		url: url('macos', 'JDMO.Hub.app.tar.gz')
	};
}

// Windows (x86_64) — NSIS setup exe
const winSig = readSig('nsis', `JDMO.Hub_${version}_x64-setup.exe`);
if (winSig) {
	platforms['windows-x86_64'] = {
		signature: winSig,
		url: url('nsis', `JDMO.Hub_${version}_x64-setup.exe`)
	};
}

if (Object.keys(platforms).length === 0) {
	console.error(
		'No signed updater artifacts found (.sig files missing). Expected macOS in ./macos and Windows in ./nsis.'
	);
	process.exit(1);
}

const manifest = {
	version,
	notes: '',
	pub_date: new Date().toISOString(),
	platforms
};

fs.writeFileSync(path.join(dir, 'latest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
