<script>
	import {
		Download,
		Play,
		Trash2,
		FolderOpen,
		Loader2,
		CheckCircle2,
		HardDrive,
		FileX,
		MoreVertical,
		X
	} from 'lucide-svelte';
	import API from '$lib/api.js';
	import { launcher, downloadProgress, uninstallProgress, manifestSize } from '$lib/launcher.js';
	import { open as pickFolder } from '@tauri-apps/plugin-dialog';

	export let game;
	export let onRefresh = () => {};

	let downloading = false;
	let status = '';
	let error = '';
	let launching = false;
	let eta = '';
	let progress = { downloaded: 0, total: 0, speed: 0, file: '' };
	let unsub = null;

	// Uninstall state
	let confirmAction = null; // 'uninstall' | 'remove' | null
	let uninstalling = false;
	let uProgress = { done: 0, total: 0 };
	let unsubUninstall = null;

	// Update-check state
	let updateInfo = null; // { needsUpdate, filesToDownload, totalFiles, version }
	let checkingUpdates = false;
	let lastCheckKey = '';

	// Pre-download confirmation state
	let pending = null; // { folder, totalSize, freeSpace }
	let checking = false;

	// Kebab menu
	let menuOpen = false;

	const pct = () => {
		if (!progress.total) return 0;
		return Math.min(100, Math.round((progress.downloaded / progress.total) * 100));
	};

	const fmtBytes = (b) => {
		if (!b) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB'];
		let i = 0;
		let v = b;
		while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
		return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
	};

	const fmtGb = (b) => {
		const gb = b / (1024 * 1024 * 1024);
		return `${gb >= 10 ? gb.toFixed(0) : gb.toFixed(1)} GB`;
	};

	const fmtEta = (seconds) => {
		if (!seconds || !isFinite(seconds) || seconds <= 0) return '';
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		if (h > 0) return `${h}h ${m}m left`;
		if (m > 0) return `${m}m ${s}s left`;
		return `${Math.max(1, s)}s left`;
	};

	function subscribeProgress() {
		unsub?.();
		unsub = downloadProgress.subscribe((p) => {
			if (!p || p.gameId !== game.id) return;
			if (p.error) { error = p.error; downloading = false; return; }
			if (p.finished) {
				status = 'Done!';
				downloading = false;
				eta = '';
				progress = { downloaded: p.total, total: p.total, speed: 0, file: '' };
				onRefresh();
			} else {
				progress = { downloaded: p.downloaded, total: p.total, speed: p.speed, file: p.file };
				const remaining = p.total - p.downloaded;
				const speedBytes = p.speed * 1024 * 1024;
				eta = speedBytes > 0 ? fmtEta(remaining / speedBytes) : '';
				status = p.file === 'checking' ? 'Checking for updates…' : p.file === 'done' ? 'Done!' : p.file;
			}
		});
	}

	async function startDownload() {
		error = '';
		checking = true;

		// Ask where to download, then check size/space before proceeding
		while (true) {
			const folder = await pickFolder({
				title: 'Choose where to save games',
				directory: true,
				canCreateDirectories: true
			});
			if (!folder) { checking = false; return; } // cancelled

			try {
				const manifest = await launcher.getManifest(game.id);
				const totalSize = manifestSize(manifest);
				let freeSpace = 0;
				try { freeSpace = await launcher.getFreeSpace(folder); } catch (e) { console.error('free_space:', e); }

				// Not enough space — force them to pick another folder
				if (freeSpace > 0 && freeSpace < totalSize) {
					error = `Not enough space — this game needs ${fmtBytes(totalSize)} but only ${fmtBytes(freeSpace)} is free in that folder. Please pick another location.`;
					continue;
				}

				pending = { folder, totalSize, freeSpace };
				checking = false;
				return;
			} catch (e) {
				console.error('Failed to check download:', e);
				error = e?.message || 'Failed to check download size';
				checking = false;
				return;
			}
		}
	}

	async function confirmDownload() {
		error = '';
		await launcher.setDownloadPath(pending.folder);
		pending = null;
		status = 'Checking for updates…';
		subscribeProgress();
		downloading = true;
		try {
			await launcher.downloadGame(game.id);
		} catch (e) {
			console.error('Game download failed:', e);
			error = e?.message || 'Download failed. Please try again.';
			downloading = false;
		}
	}

	async function changeFolder() {
		pending = null;
		startDownload();
	}

	function cancelPending() {
		pending = null;
	}

	async function launch() {
		error = '';
		launching = true;
		try {
			await launcher.launchGame(game.id, API);
		} catch (e) {
			console.error('Failed to launch game:', e);
			error = e?.message || 'Failed to launch game';
		} finally {
			launching = false;
		}
	}

	function requestUninstall() {
		menuOpen = false;
		confirmAction = 'uninstall';
	}

	function requestRemoveLocated() {
		menuOpen = false;
		confirmAction = 'remove';
	}

	function cancelConfirm() {
		confirmAction = null;
	}

	async function doUninstall() {
		confirmAction = null;
		error = '';
		unsubUninstall?.();
		unsubUninstall = uninstallProgress.subscribe((p) => {
			if (!p || p.gameId !== game.id) return;
			if (p.error) { uninstalling = false; error = p.error; return; }
			if (p.finished) { uninstalling = false; onRefresh(); }
			else { uProgress = { done: p.done, total: p.total }; }
		});
		uninstalling = true;
		try {
			await launcher.deleteGame(game.id);
		} catch (e) {
			console.error('Failed to uninstall:', e);
			error = e?.message || 'Failed to uninstall';
			uninstalling = false;
		}
	}

	async function doRemoveLocated() {
		confirmAction = null;
		error = '';
		try {
			await launcher.forgetGame(game.id);
			onRefresh();
		} catch (e) {
			console.error('Failed to remove game:', e);
			error = e?.message || 'Failed to remove game';
		}
	}

	async function locate() {
		menuOpen = false;
		error = '';
		try {
			await launcher.locateGame(game.id);
			onRefresh();
		} catch (e) {
			console.error('Failed to locate game:', e);
			error = e?.message || 'Failed to locate game';
		}
	}

	async function showFiles() {
		menuOpen = false;
		try { await launcher.showInFileManager(game.id); } catch (e) { console.error(e); }
	}

	$: installed = game?.installed;

	const PLATFORM_NAMES = { pc: 'PC', ps4: 'PS4', nx: 'Switch', wiiu: 'Wii U' };
	const platformLabel = (p) => PLATFORM_NAMES[p] || p?.toUpperCase();

	// Check for updates whenever install state changes (installed, located, etc.)
	$: checkKey = `${game?.id}:${installed}:${game?.located}`;
	$: if (checkKey !== lastCheckKey) {
		lastCheckKey = checkKey;
		updateInfo = null;
		if (installed) checkUpdates();
	}

	async function checkUpdates() {
		checkingUpdates = true;
		try {
			updateInfo = await launcher.checkGameUpdates(game.id);
		} catch (e) {
			console.error('Update check failed:', e);
			updateInfo = null;
		} finally {
			checkingUpdates = false;
		}
	}

	async function runUpdate() {
		error = '';
		status = 'Checking for updates…';
		subscribeProgress();
		downloading = true;
		try {
			await launcher.downloadGame(game.id);
			await checkUpdates();
		} catch (e) {
			console.error('Game update failed:', e);
			error = e?.message || 'Update failed. Please try again.';
			downloading = false;
		}
	}
</script>

<svelte:window on:click={(e) => { if (!e.target?.closest('[data-kebab]')) menuOpen = false; }} />

<div class="relative group rounded-2xl overflow-hidden bg-gray-900/40 backdrop-blur-xl border border-gray-700/40 hover:border-purple-400/40 transition-all duration-300">
	<!-- Header banner -->
	<div class="h-36 w-full relative bg-cover bg-center" style="background-image: url('/splash.png')">
		<div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
		<div class="absolute bottom-3 left-4 right-4">
			<div class="text-white font-bold text-lg drop-shadow">{game.name}</div>
			{#if game.platforms?.length}
				<div class="flex gap-1.5 mt-1">
					{#each game.platforms as p}
						<span
							class="px-1.5 py-0.5 rounded bg-black/50 backdrop-blur border border-white/15 text-white text-[10px] font-semibold uppercase tracking-wide drop-shadow"
						>
							{platformLabel(p)}
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Kebab menu -->
		{#if !downloading && !pending}
			<div class="absolute top-2 right-2 z-30" data-kebab>
				<button
					on:click|stopPropagation={() => (menuOpen = !menuOpen)}
					class="w-8 h-8 rounded-lg bg-black/40 backdrop-blur border border-white/10 text-white hover:bg-black/60 flex items-center justify-center transition-all"
					title="More options"
				>
					<MoreVertical size={16} />
				</button>
				{#if menuOpen}
					<div class="absolute right-0 top-10 w-52 rounded-xl bg-gray-900/95 backdrop-blur border border-gray-700/50 shadow-2xl overflow-hidden z-40">
						{#if installed}
							<button
								on:click={showFiles}
								class="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800/70 transition-colors"
							>
								<FolderOpen size={15} /> Show game location
							</button>
							{#if game.located}
								<button
									on:click={requestRemoveLocated}
									class="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-900/20 transition-colors"
								>
									<Trash2 size={15} /> Remove from launcher
								</button>
							{:else}
								<button
									on:click={requestUninstall}
									class="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 transition-colors"
								>
									<Trash2 size={15} /> Uninstall
								</button>
							{/if}
						{:else}
							<button
								on:click={locate}
								class="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800/70 transition-colors"
							>
								<FolderOpen size={15} /> Locate game…
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<div class="p-4 space-y-3">
		<!-- Pre-download confirmation -->
		{#if pending}
			<div class="space-y-3">
				<div class="text-sm font-semibold text-gray-100">Confirm Download</div>
				<div class="space-y-1.5 text-xs text-gray-300">
					<div class="flex justify-between"><span class="text-gray-400">Download size</span><span>{fmtBytes(pending.totalSize)}</span></div>
					<div class="flex justify-between"><span class="text-gray-400">Free space</span><span class="{pending.freeSpace > 0 && pending.freeSpace < pending.totalSize ? 'text-red-400' : 'text-green-400'}">{pending.freeSpace > 0 ? fmtBytes(pending.freeSpace) : 'Unknown'}</span></div>
				</div>
				<div class="flex gap-2">
					<button
						on:click={confirmDownload}
						class="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 transition-all"
					>
						<Download size={15} /> Download
					</button>
					<button
						on:click={changeFolder}
						class="px-3 py-2 rounded-xl bg-gray-800/50 border border-gray-700/40 text-gray-200 text-sm hover:border-purple-400/50 transition-all"
					>
						Change folder
					</button>
					<button
						on:click={cancelPending}
						class="px-3 py-2 rounded-xl bg-gray-800/50 border border-gray-700/40 text-gray-400 text-sm hover:border-gray-500/50 transition-all"
						aria-label="Cancel"
					>
						<X size={15} />
					</button>
				</div>
			</div>
		{:else if checking}
			<div class="flex items-center gap-2 text-xs text-gray-300">
				<Loader2 size={15} class="animate-spin text-purple-400" /> Checking download…
			</div>
		{:else if downloading}
			<div class="space-y-1">
				<div class="flex justify-between text-xs text-gray-300">
					<span class="truncate max-w-[60%]">{status || 'Downloading…'}</span>
					<span>{pct()}% · {progress.speed.toFixed(1)} MB/s</span>
				</div>
				<div class="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
					<div class="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-200" style="width: {pct()}%"></div>
				</div>
				<div class="flex justify-between text-xs text-gray-400">
					<span>{fmtBytes(progress.downloaded)} / {fmtBytes(progress.total)}</span>
					{#if eta}<span class="text-purple-300">{eta}</span>{/if}
				</div>
			</div>
		{:else if uninstalling}
			<div class="space-y-1">
				<div class="flex justify-between text-xs text-gray-300">
					<span class="inline-flex items-center gap-1.5"><Loader2 size={13} class="animate-spin" /> Uninstalling…</span>
					<span>{uProgress.total ? Math.round((uProgress.done / uProgress.total) * 100) : 0}%</span>
				</div>
				<div class="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
					<div
						class="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-200"
						style="width: {uProgress.total ? Math.round((uProgress.done / uProgress.total) * 100) : 0}%"
					></div>
				</div>
				<div class="text-xs text-gray-400">{uProgress.done} / {uProgress.total} files removed</div>
			</div>
		{:else if error}
			<div class="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
		{/if}

		<!-- Update available banner -->
		{#if updateInfo?.needsUpdate && !downloading && !pending && !uninstalling}
			<div class="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
				Update available — {updateInfo.filesToDownload} file{updateInfo.filesToDownload === 1 ? '' : 's'} need updating
				{#if updateInfo.version} (v{updateInfo.version}){/if}
			</div>
		{:else if installed && checkingUpdates && !downloading}
			<div class="flex items-center gap-2 text-xs text-gray-400">
				<Loader2 size={13} class="animate-spin text-purple-400" /> Checking for updates…
			</div>
		{/if}

		<!-- Meta -->
		<div class="flex items-center gap-3 text-xs text-gray-400">
			{#if installed}
				<span class="inline-flex items-center gap-1 text-green-400"><CheckCircle2 size={13} /> Installed</span>
				{#if game.located}
					<span class="text-gray-500">Located</span>
				{:else if game.installed_version && game.installed_version !== 'located'}
					<span class="text-gray-500">v{game.installed_version}</span>
				{/if}
			{:else}
				<span class="inline-flex items-center gap-1 text-gray-500"><FileX size={13} /> Not installed</span>
			{/if}
			{#if game.totalSize}
				<span class="ml-auto inline-flex items-center gap-1"><HardDrive size={13} /> {fmtGb(game.totalSize)}</span>
			{:else if game.size_mb}
				<span class="ml-auto inline-flex items-center gap-1"><HardDrive size={13} /> ~{game.size_mb} MB</span>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex flex-wrap gap-2">
			{#if installed}
				{#if updateInfo?.needsUpdate}
					<button
						on:click={runUpdate}
						disabled={downloading || checkingUpdates}
						class="flex-1 min-w-[6rem] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
					>
						{#if downloading}<Loader2 size={16} class="animate-spin" />{:else}<Download size={16} />{/if}
						{downloading ? 'Updating…' : `Update (${updateInfo.filesToDownload})`}
					</button>
				{:else}
					<button
						on:click={launch}
						disabled={launching || downloading || uninstalling || checkingUpdates}
						class="flex-1 min-w-[6rem] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
					>
						{#if launching}<Loader2 size={16} class="animate-spin" />{:else}<Play size={16} />{/if}
						{launching ? 'Launching…' : 'Play'}
					</button>
				{/if}
			{:else}
				<button
					on:click={startDownload}
					disabled={downloading || checking || !!pending || uninstalling}
					class="flex-1 min-w-[6rem] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
				>
					{#if checking}<Loader2 size={16} class="animate-spin" />{:else}<Download size={16} />{/if}
					{checking ? 'Checking…' : 'Download'}
				</button>
			{/if}
		</div>
	</div>

	<!-- Custom confirm modal -->
	{#if confirmAction}
		<div class="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div class="w-full max-w-xs rounded-2xl bg-gray-900 border border-gray-700/50 p-5 space-y-4 shadow-2xl">
				<div class="text-sm font-semibold text-gray-100">
					{confirmAction === 'uninstall' ? `Uninstall ${game.name}?` : `Remove ${game.name} from launcher?`}
				</div>
				<p class="text-xs text-gray-400">
					{confirmAction === 'uninstall'
						? 'This will permanently delete the game files from your computer.'
						: 'The game will be removed from the launcher, but your files will be kept.'}
				</p>
				<div class="flex gap-2">
					<button
						on:click={confirmAction === 'uninstall' ? doUninstall : doRemoveLocated}
						class="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 transition-all"
					>
						{confirmAction === 'uninstall' ? 'Uninstall' : 'Remove'}
					</button>
					<button
						on:click={cancelConfirm}
						class="px-3 py-2 rounded-xl bg-gray-800/50 border border-gray-700/40 text-gray-300 text-sm hover:border-gray-500/50 transition-all"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
