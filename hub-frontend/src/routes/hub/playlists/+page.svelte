<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { get } from 'svelte/store';
    import API from '$lib/api.js';
    import Utils from '$lib/utils';
    import PlaylistsHeader from '$lib/components/Hub/Playlists/PlaylistsHeader.svelte';
    import PlaylistsTable from '$lib/components/Hub/Playlists/PlaylistsTable.svelte';

    let playlists = [];
    let playlistCount = 0;
    let allSongs = [];
    let selectedPlaylist = null;
    let loadingPlaylists = true;
    let errorMessage = null;

    onMount(async () => {
        try {
            const [playlistData, songDb] = await Promise.all([
                API.getPlaylists(),
                API.getSongs()
            ]);

            playlists = playlistData ?? [];
            allSongs = songDb ?? [];
            playlistCount = playlists.length;

            // Auto-select playlist if ?pid= param is present
            const pid = get(page).url.searchParams.get('pid');
            if (pid) {
                selectedPlaylist = playlists.find(p => String(p.playlistId) === String(pid)) ?? null;
            }
        } catch (error) {
            console.error('Failed to load playlists:', error);
            errorMessage = "Can't fetch playlists. Please try again later.";
        } finally {
            loadingPlaylists = false;
        }
    });

    function onSelectPlaylist(playlist) {
        selectedPlaylist = playlist;
    }
</script>

<svelte:head>
	<title>{Utils.getTitle('Playlists', true)}</title>
</svelte:head>

<div class="relative min-h-screen overflow-hidden">
	<div class="absolute top-24 left-16 w-36 h-36 bg-pink-500/8 rounded-full blur-3xl animate-pulse"></div>
	<div class="absolute top-80 right-24 w-32 h-32 bg-purple-500/8 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
	<div class="absolute bottom-32 left-1/4 w-28 h-28 bg-blue-500/8 rounded-full blur-3xl animate-pulse animation-delay-4000"></div>

	<div class="relative z-10 p-4 md:p-8 space-y-6 md:space-y-8">
		<PlaylistsHeader playlistCount={playlistCount} loadingPlaylists={loadingPlaylists} />

		{#if errorMessage}
			<div class="bg-red-500/20 text-red-400 p-4 rounded-xl text-center border border-red-500/30">
				{errorMessage}
				<button
					on:click={() => { errorMessage = null; }}
					class="ml-4 text-white bg-purple-600 hover:bg-purple-700 px-4 py-1 rounded-lg transition-colors"
				>
					Dismiss
				</button>
			</div>
		{/if}

		<PlaylistsTable
			{playlists}
			{loadingPlaylists}
			{allSongs}
			{selectedPlaylist}
			{onSelectPlaylist}
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