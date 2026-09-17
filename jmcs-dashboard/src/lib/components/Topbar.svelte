<script lang="ts">
	import { page } from '$app/state';
	import { Search, Server, RefreshCw } from 'lucide-svelte';
	import { currentEnv, ENVS, triggerRefresh } from '$lib/jmcs';

	let title = $derived(
		page.url.pathname.split('/')[1]
			? page.url.pathname
					.split('/')[1]
					.split('-')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ')
			: 'Dashboard'
	);
	let { isServerPanelOpen = $bindable(false) } = $props();

	let isRefreshing = $state(false);

	async function handleRefresh() {
		isRefreshing = true;
		triggerRefresh();
		// Artificial delay for UX
		setTimeout(() => (isRefreshing = false), 500);
	}

	const envColors = {
		PROD: 'border-red-500 text-red-400',
		DEV: 'border-blue-500 text-blue-400',
		LOCAL: 'border-slate-500 text-slate-400'
	};
</script>

<header
	class="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6"
>
	<div class="flex items-center gap-6">
		<h1 class="text-xl font-semibold text-white">{title}</h1>
	</div>

	<div class="flex items-center gap-2">
		<button
			onclick={handleRefresh}
			class="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-400 transition-all hover:bg-slate-800 hover:text-white"
			title="Refresh Data"
		>
			<RefreshCw class="h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
		</button>

		<button
			onclick={() => (isServerPanelOpen = true)}
			class="flex items-center gap-2 rounded-lg border bg-slate-800/50 px-3 py-1.5 transition-all hover:bg-slate-800 {envColors[
				$currentEnv
			]}"
		>
			<Server class="h-4 w-4" />
			<span class="text-sm font-bold">{$currentEnv}</span>
			<div class="h-1.5 w-1.5 rounded-full bg-current animate-pulse"></div>
		</button>
	</div>
</header>


