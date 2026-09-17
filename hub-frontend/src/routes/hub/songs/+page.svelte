<script>
	import API from '$lib/api.js';
	import SongsHeader from '$lib/components/Hub/Songs/SongsHeader.svelte';
	import SongsList from '$lib/components/Hub/Songs/SongsList.svelte';
	import { onMount } from 'svelte';
	import Utils from '$lib/utils.js';

	let allSongs = [];
	let versions = [];
	let selectedVersion = null;
	let loadingSongs = true;

	onMount(async () => {
		try {
			const [games, songDb] = await Promise.all([API.getGames(), API.getSongs()]);

			const availableSongVersions = new Set(songDb.map((s) => String(s.jdVersion)));

			const gamesWithSongs = games.filter(
				(game) => game.isAvailable && availableSongVersions.has(String(game.jdVersion))
			);

			gamesWithSongs.unshift({ id: 'all', name: 'All Games', isAvailable: true, platforms: [], jdVersion: null });
			versions = gamesWithSongs;
			allSongs = songDb;

			if (versions.length > 0) selectedVersion = versions[0];
		} catch (error) {
			console.error('Failed loading data:', error);
			versions = [];
			allSongs = [];
		} finally {
			loadingSongs = false;
		}
	});
</script>

<svelte:head>
	<title>{Utils.getTitle('Songs', true)}</title>
</svelte:head>

<div class="relative min-h-screen overflow-hidden">
	<div class="absolute top-24 left-16 w-36 h-36 bg-pink-500/8 rounded-full blur-3xl animate-pulse"></div>
	<div class="absolute top-80 right-24 w-32 h-32 bg-purple-500/8 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
	<div class="absolute bottom-32 left-1/4 w-28 h-28 bg-blue-500/8 rounded-full blur-3xl animate-pulse animation-delay-4000"></div>

	<div class="relative z-10 p-4 md:p-8 space-y-6 md:space-y-8">
		<SongsHeader />
		<SongsList
			bind:allSongs
			bind:selectedVersion
			{versions}
			{loadingSongs}
		/>
	</div>
</div>

<style>
	.animation-delay-2000 { animation-delay: 2s; }
	.animation-delay-4000 { animation-delay: 4s; }

	::-webkit-scrollbar { width: 6px; height: 6px; }
	::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 3px; }
	::-webkit-scrollbar-thumb { background: linear-gradient(to bottom, #8b5cf6, #ec4899); border-radius: 3px; }
	::-webkit-scrollbar-thumb:hover { background: linear-gradient(to bottom, #7c3aed, #db2777); }

	@media (prefers-reduced-motion: reduce) {
		*, *::before, *::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>