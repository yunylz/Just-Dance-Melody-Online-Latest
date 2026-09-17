<script lang="ts">
	import { onMount } from 'svelte';
	import { Database, RefreshCw, CheckCircle, XCircle, Star } from 'lucide-svelte';
	import { fetchApi } from '$lib/api';
	import { user } from '$lib/jmcs';

	let dbStatus: any = $state(null);
	let refreshing = $state(false);

	onMount(async () => {
		try {
			const data = await fetchApi<any>('/songdb/v2/songs/status');
			dbStatus = data.status;
		} catch {}
	});

	async function refreshDbs() {
		refreshing = true;
		try {
			const username = $user?.name || 'Unknown';
			const data = await fetchApi<any>('/songdb/v2/songs/refresh', {
				method: 'POST',
				body: JSON.stringify({ triggeredBy: username })
			});
			alert(data.message || 'Databases refreshed!');
			const statusData = await fetchApi<any>('/songdb/v2/songs/status');
			dbStatus = statusData.status;
		} catch (e: any) {
			alert('Refresh failed: ' + e.message);
		} finally { refreshing = false; }
	}

	function platformList(paths: Record<string, string> | undefined): string[] {
		return Object.keys(paths || {});
	}
</script>

<div class="space-y-6">
	<h2 class="text-xl font-semibold text-white">Database Utilities</h2>

	<div class="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center text-center max-w-lg mx-auto">
		<div class="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-5">
			<Database class="w-8 h-8 text-indigo-400" />
		</div>
		<h3 class="text-lg font-bold text-white mb-2">Refresh Databases</h3>
		<p class="text-slate-400 text-sm mb-6">Builds and uploads SongDB (prod + dev + patreon) and LocDB for all SKUs, and updates the cache.</p>
		<button
			onclick={refreshDbs}
			disabled={refreshing}
			class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
		>
			<RefreshCw class="w-5 h-5 {refreshing ? 'animate-spin' : ''}" />
			{refreshing ? 'Refreshing...' : 'Start Refresh'}
		</button>

		{#if dbStatus}
			<div class="mt-6 w-full text-left bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-4">
				<div class="flex justify-between text-sm">
					<span class="text-slate-400">Triggered by</span>
					<span class="text-white font-medium">{dbStatus.triggeredBy || 'Unknown'}</span>
				</div>
				<div class="flex justify-between text-sm">
					<span class="text-slate-400">Last refreshed</span>
					<span class="text-white font-medium">{new Date(dbStatus.lastRefreshedAt).toLocaleString()}</span>
				</div>

				<!-- Prod SongDB paths -->
				<div class="pt-3 border-t border-slate-700">
					<div class="flex items-center gap-2 mb-2">
						<CheckCircle class="w-4 h-4 text-green-400" />
						<span class="text-xs font-bold text-green-400 uppercase tracking-widest">Production SongDB</span>
					</div>
					{#each platformList(dbStatus.songDbPaths) as platform}
						<div class="mb-2">
							<p class="text-[10px] text-slate-500 font-mono">{platform}</p>
							<p class="text-xs font-mono text-slate-300 break-all">{dbStatus.songDbPaths[platform]}</p>
						</div>
					{/each}
					{#if !dbStatus.songDbPaths || platformList(dbStatus.songDbPaths).length === 0}
						<p class="text-xs text-slate-600 italic">No production paths built yet.</p>
					{/if}
				</div>

				<!-- Dev SongDB paths -->
				<div class="pt-3 border-t border-slate-700">
					<div class="flex items-center gap-2 mb-2">
						<XCircle class="w-4 h-4 text-amber-400" />
						<span class="text-xs font-bold text-amber-400 uppercase tracking-widest">Dev SongDB</span>
					</div>
					{#each platformList(dbStatus.devSongDbPaths) as platform}
						<div class="mb-2">
							<p class="text-[10px] text-slate-500 font-mono">{platform}</p>
							<p class="text-xs font-mono text-slate-300 break-all">{dbStatus.devSongDbPaths[platform]}</p>
						</div>
					{/each}
					{#if !dbStatus.devSongDbPaths || platformList(dbStatus.devSongDbPaths).length === 0}
						<p class="text-xs text-slate-600 italic">No dev paths built yet.</p>
					{/if}
				</div>

				<!-- Patreon SongDB paths -->
				<div class="pt-3 border-t border-slate-700">
					<div class="flex items-center gap-2 mb-2">
						<Star class="w-4 h-4 text-purple-400" />
						<span class="text-xs font-bold text-purple-400 uppercase tracking-widest">Patreon SongDB</span>
					</div>
					{#each platformList(dbStatus.patreonSongDbPaths) as platform}
						<div class="mb-2">
							<p class="text-[10px] text-slate-500 font-mono">{platform}</p>
							<p class="text-xs font-mono text-slate-300 break-all">{dbStatus.patreonSongDbPaths[platform]}</p>
						</div>
					{/each}
					{#if !dbStatus.patreonSongDbPaths || platformList(dbStatus.patreonSongDbPaths).length === 0}
						<p class="text-xs text-slate-600 italic">No patreon paths built yet.</p>
					{/if}
				</div>

				<!-- LocsDB -->
				{#if dbStatus.locsDbPath}
					<div class="pt-3 border-t border-slate-700">
						<p class="text-xs text-slate-500 mb-1">LocsDB Path</p>
						<p class="text-xs font-mono text-slate-300 break-all">{dbStatus.locsDbPath}</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
