<script>
	import { Search, Loader2, ChevronLeft, ChevronRight, CircleQuestionMark } from 'lucide-svelte';
	import SongItem from '$lib/components/Hub/Shared/SongItem.svelte';
	import { onMount } from 'svelte';

	// ── Data ──────────────────────────────────────────────────────────────────
	export let allSongs = [];
	export let versions = [];
	export let loadingSongs = false;

	// ── Selection mode (leaderboard) ─────────────────────────────────────────
	export let selectable = false;
	export let selectedSong = null;
	export let onSelectSong = (song) => {};

	// ── Internal state ────────────────────────────────────────────────────────
	let searchQuery = '';
	let currentPage = 1;
	const songsPerPage = 12;
	let _selectedVersion = null;

	// Track cover load state per mapName
	let loadedImages = new Set();
	$: { pageSongs; loadedImages = new Set(); }

	// ── Group versions by name ────────────────────────────────────────────────
	$: groupedVersions = (() => {
		const map = new Map();
		for (const v of versions) {
			if (map.has(v.name)) {
				map.get(v.name).ids.push(v.id);
			} else {
				map.set(v.name, { name: v.name, ids: [v.id] });
			}
		}
		return [...map.values()];
	})();

	// Auto-init to first grouped version on mount
	onMount(() => {
		if (!_selectedVersion && groupedVersions.length > 0) {
			_selectedVersion = groupedVersions[0];
		}
	});

	// Also react if versions load after mount
	$: if (!_selectedVersion && groupedVersions.length > 0) {
		_selectedVersion = groupedVersions[0];
	}

	// Reset page on version or search change
	$: { _selectedVersion; searchQuery; currentPage = 1; }

	// Songs for the active version
	$: versionSongs = _selectedVersion
		? _selectedVersion.ids.includes('all')
			? allSongs
			: allSongs.filter((s) => _selectedVersion.ids.includes(String(s.jdVersion)))
		: [];

	// Locally filtered by search
	$: filteredSongs = searchQuery.trim()
		? versionSongs.filter(
				(s) =>
					s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					s.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
					s.mapName.toLowerCase().includes(searchQuery.toLowerCase())
		  )
		: versionSongs;

	// Pagination
	$: totalPages = Math.max(1, Math.ceil(filteredSongs.length / songsPerPage));
	$: pageSongs = filteredSongs.slice(
		(currentPage - 1) * songsPerPage,
		currentPage * songsPerPage
	);

	$: isSearching = searchQuery.trim().length > 0;

	function clearSearch() { searchQuery = ''; }
	function goToPage(page) {
		if (page >= 1 && page <= totalPages) currentPage = page;
	}
	function onImageLoad(mapName) {
		loadedImages = new Set([...loadedImages, mapName]);
	}
	function handleSongClick(song) {
		if (!selectable) return;
		selectedSong = song;
		onSelectSong(song);
	}
</script>

<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6">

	{#if loadingSongs}
		<div class="text-center py-12">
			<Loader2 class="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
			<p class="text-gray-400">Loading songs...</p>
		</div>

	{:else if versions.length === 0}
		<div class="text-center py-12">
			<div class="w-20 h-20 mx-auto mb-4 bg-gray-700/50 rounded-full flex items-center justify-center">
				<CircleQuestionMark class="w-10 h-10 text-gray-400" />
			</div>
			<h3 class="text-xl font-semibold text-gray-300 mb-2">No games available!</h3>
			<p class="text-gray-400">Please check back later.</p>
		</div>

	{:else}
		<!-- Version selector -->
		<div class="relative mb-4">
			<select
				bind:value={_selectedVersion}
				class="appearance-none bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl px-4 py-3 pr-10 text-white focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all duration-300 w-full"
			>
				{#each groupedVersions as version}
					<option value={version}>{version.name}</option>
				{/each}
			</select>
			<svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>

		<!-- Search -->
		<div class="relative mb-4">
			<Search class="absolute z-10 left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
			<input
				type="text"
				placeholder="Search songs..."
				bind:value={searchQuery}
				class="w-full pl-12 pr-12 py-3 bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all duration-300"
			/>
			{#if searchQuery}
				<button
					on:click={clearSearch}
					class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>

		<!-- Song grid -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4 max-h-[50vh] overflow-y-auto overscroll-contain p-1">
			{#if pageSongs.length === 0 && !isSearching}
				<div class="col-span-full text-center py-12">
					<div class="w-20 h-20 mx-auto mb-4 bg-gray-700/50 rounded-full flex items-center justify-center">
						<CircleQuestionMark class="w-10 h-10 text-gray-400" />
					</div>
					<h3 class="text-xl font-semibold text-gray-300 mb-2">No songs available</h3>
					<p class="text-gray-400">Please check back later</p>
				</div>

			{:else if pageSongs.length === 0 && isSearching}
				<div class="col-span-full text-center py-12">
					<div class="w-20 h-20 mx-auto mb-4 bg-gray-700/50 rounded-full flex items-center justify-center">
						<CircleQuestionMark class="w-10 h-10 text-gray-400" />
					</div>
					<h3 class="text-xl font-semibold text-gray-300 mb-2">No songs found</h3>
					<p class="text-gray-400">Try a different search term</p>
				</div>

			{:else if selectable}
				{#each pageSongs as song (song.mapName)}
					<button
						class="relative rounded-2xl text-left transition-all duration-200 focus:outline-none
							{selectedSong?.mapName === song.mapName
								? 'outline outline-2 outline-purple-400 outline-offset-2'
								: 'hover:outline hover:outline-1 hover:outline-purple-400/40 hover:outline-offset-1'}"
						on:click={() => handleSongClick(song)}
					>
						<SongItem {song} />
						{#if selectedSong?.mapName === song.mapName}
							<div class="absolute top-2 right-2 z-10 w-2.5 h-2.5 bg-purple-400 rounded-full animate-pulse"></div>
						{/if}
					</button>
				{/each}

			{:else}
				{#each pageSongs as song (song.mapName)}
					<SongItem {song} />
				{/each}
			{/if}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex flex-wrap items-center justify-between gap-3 bg-gray-700/30 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-3 mb-3">
				<button
					on:click={() => goToPage(currentPage - 1)}
					disabled={currentPage === 1}
					class="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-800/50 disabled:opacity-50 border border-gray-600/50 rounded-xl text-white transition-all duration-300 disabled:cursor-not-allowed"
				>
					<ChevronLeft class="w-4 h-4" />
					Previous
				</button>

				<div class="flex items-center gap-2">
					<span class="text-sm text-gray-400">Page {currentPage} of {totalPages}</span>
					<span class="text-xs text-gray-500">
						({(currentPage - 1) * songsPerPage + 1}–{Math.min(currentPage * songsPerPage, filteredSongs.length)} of {filteredSongs.length} songs)
					</span>
				</div>

				<button
					on:click={() => goToPage(currentPage + 1)}
					disabled={currentPage === totalPages}
					class="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-800/50 disabled:opacity-50 border border-gray-600/50 rounded-xl text-white transition-all duration-300 disabled:cursor-not-allowed"
				>
					Next
					<ChevronRight class="w-4 h-4" />
				</button>
			</div>
		{/if}

		<!-- Search result count -->
		{#if isSearching && pageSongs.length > 0}
			<div class="bg-blue-500/20 border border-blue-400/30 rounded-xl p-3 text-center">
				<p class="text-blue-400 text-sm">
					{filteredSongs.length} song{filteredSongs.length !== 1 ? 's' : ''} found for "{searchQuery}"
				</p>
			</div>
		{/if}
	{/if}
</div>