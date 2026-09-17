<script>
	import { onMount } from 'svelte';
	import { X, Download, Loader2, Sparkles } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import { isTauri } from '$lib/tauri.js';
	import { checkForUpdate, installUpdate } from '$lib/updater.js';

	let checking = true;
	let update = null;
	let installing = false;
	let error = null;
	let dismissed = false;
	let progress = { downloaded: 0, contentLength: 0 };

	onMount(async () => {
		if (!isTauri()) {
			checking = false;
			return;
		}
		update = await checkForUpdate();
		checking = false;
	});

	$: pct =
		progress.contentLength > 0
			? Math.min(100, Math.round((progress.downloaded / progress.contentLength) * 100))
			: 0;

	$: isUpToDate = !checking && !update;

	async function handleInstall() {
		if (!update) return;
		installing = true;
		error = null;
		try {
			await installUpdate(update, (p) => (progress = p));
			// App relaunches; if it returns (e.g. manual restart chosen) we hide.
			dismissed = true;
		} catch (e) {
			error = e?.message || 'Update failed. Please try again later.';
			installing = false;
		}
	}

	function close() {
		dismissed = true;
	}
</script>

{#if isTauri() && !checking && update && !dismissed}
	<div class="mb-3" in:fly={{ y: -40, duration: 350 }} out:fade={{ duration: 200 }}>
		<div class="bg-gray-900/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden">
			{#if installing && !error}
				<!-- Installing / progress -->
				<div class="flex items-center gap-3 p-4">
					<div class="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
						{#if pct >= 100}
							<Sparkles class="w-5 h-5 text-white" />
						{:else}
							<Loader2 class="w-5 h-5 text-white animate-spin" />
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-semibold text-white">
							{pct >= 100 ? 'Installing update…' : `Downloading v${update.version}… ${pct}%`}
						</p>
						<div class="w-full h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
							<div
								class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
								style="width: {pct}%"
							></div>
						</div>
					</div>
				</div>
			{:else}
				<div class="flex items-start gap-3 p-4">
					<div class="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
						<Download class="w-5 h-5 text-white" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-semibold text-white">Update available — v{update.version}</p>
						<p class="text-xs text-gray-400 mt-0.5 leading-relaxed">
							A new version of JDMO Hub is ready. Update now to get the latest features.
						</p>
						{#if error}
							<p class="text-xs text-red-400 mt-1.5">{error}</p>
						{/if}
						<div class="flex items-center gap-2 mt-3">
							<button
								on:click={handleInstall}
								disabled={installing}
								class="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
							>
								Update
							</button>
							<button
								on:click={close}
								class="px-3 py-1.5 bg-gray-800 text-gray-400 text-xs font-medium rounded-lg hover:text-white transition-colors"
							>
								Later
							</button>
						</div>
					</div>
					<button
						on:click={close}
						class="flex-shrink-0 text-gray-500 hover:text-white transition-colors"
						aria-label="Dismiss"
					>
						<X class="w-4 h-4" />
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}