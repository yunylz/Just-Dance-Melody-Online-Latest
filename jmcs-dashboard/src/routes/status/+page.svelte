<script lang="ts">
	import { onMount } from 'svelte';
	import { Activity, Server, Clock, GitBranch } from 'lucide-svelte';
	import { fetchApi } from '$lib/api';
	import { refreshTrigger } from '$lib/jmcs';

	let info: any = $state(null);
	let loading = $state(true);

	async function load() {
		try {
			loading = true;
			info = await fetchApi<any>('/status/v1/info');
		} finally {
			loading = false;
		}
	}

	onMount(() => load());

	$effect(() => {
		if ($refreshTrigger) load();
	});

	function formatUptime(bootTime: number) {
		const secs = Math.floor((Date.now() - bootTime) / 1000);
		const h = Math.floor(secs / 3600);
		const m = Math.floor((secs % 3600) / 60);
		const s = secs % 60;
		return `${h}h ${m}m ${s}s`;
	}
</script>

<div class="space-y-6">
	<h2 class="text-xl font-semibold text-white">Server Status</h2>

	{#if loading}
		<div class="grid grid-cols-2 gap-4">
			{#each Array(4) as _}<div class="h-24 bg-slate-800 animate-pulse rounded-xl"></div>{/each}
		</div>
	{:else if info}
		<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4">
				<div class="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
					<Server class="w-5 h-5 text-indigo-400" />
				</div>
				<div>
					<p class="text-xs text-slate-500 uppercase tracking-wider font-medium">Environment</p>
					<p class="text-lg font-bold text-white mt-1">{info.environment || 'unknown'}</p>
				</div>
			</div>
			<div class="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4">
				<div class="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center flex-shrink-0">
					<GitBranch class="w-5 h-5 text-pink-400" />
				</div>
				<div>
					<p class="text-xs text-slate-500 uppercase tracking-wider font-medium">Branch</p>
					<p class="text-lg font-bold text-white mt-1">{info.branch || 'unknown'}</p>
				</div>
			</div>
			<div class="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4">
				<div class="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
					<Activity class="w-5 h-5 text-green-400" />
				</div>
				<div>
					<p class="text-xs text-slate-500 uppercase tracking-wider font-medium">Revision</p>
					<p class="text-lg font-bold text-white mt-1 font-mono text-sm">{info.revision?.slice(0,8) || 'unknown'}</p>
				</div>
			</div>
			<div class="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4">
				<div class="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
					<Clock class="w-5 h-5 text-yellow-400" />
				</div>
				<div>
					<p class="text-xs text-slate-500 uppercase tracking-wider font-medium">Uptime</p>
					<p class="text-lg font-bold text-white mt-1">{info.bootTime ? formatUptime(info.bootTime) : 'unknown'}</p>
				</div>
			</div>
		</div>
	{:else}
		<div class="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">Failed to load server status.</div>
	{/if}
</div>
