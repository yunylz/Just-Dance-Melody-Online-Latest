<script>
	import { onMount } from 'svelte';
	import API from '$lib/api.js';
	import Utils from '$lib/utils';
	import GamesHeader from '$lib/components/Hub/Games/GamesHeader.svelte';
	import GameCard from '$lib/components/Hub/Games/GameCard.svelte';
	import { launcher } from '$lib/launcher.js';
	import { Loader2, MonitorX } from 'lucide-svelte';

	let games = [];
	let loading = true;
	let error = '';

	async function refresh() {
		try {
			games = await launcher.getGames();
		} catch (e) {
			console.error('Failed to load games:', e);
			error = typeof e === 'string' ? e : e?.message || 'Failed to load games';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		await refresh();
	});
</script>

<svelte:head>
	<title>{Utils.getTitle('Games', true)}</title>
</svelte:head>

<div class="relative min-h-screen overflow-hidden">
	<div class="absolute top-24 left-16 w-36 h-36 bg-pink-500/8 rounded-full blur-3xl animate-pulse"></div>
	<div class="absolute top-80 right-24 w-32 h-32 bg-purple-500/8 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
	<div class="absolute bottom-32 left-1/4 w-28 h-28 bg-blue-500/8 rounded-full blur-3xl animate-pulse animation-delay-4000"></div>

	<div class="relative z-10 p-4 md:p-8 space-y-6 md:space-y-8">
		<GamesHeader />

		{#if loading}
			<div class="flex items-center justify-center py-20 text-gray-400">
				<Loader2 class="w-8 h-8 animate-spin text-purple-400" />
			</div>
		{:else if error}
			<div class="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
				<MonitorX class="w-10 h-10" />
				<p>{error}</p>
			</div>
		{:else}
			<!-- Game grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
				{#each games as game}
					<GameCard {game} onRefresh={refresh} />
				{/each}
			</div>
		{/if}
	</div>
</div>
