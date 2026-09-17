<script>
	import { Loader2, Music, Search, ChevronLeft, ChevronRight, ListMusic } from 'lucide-svelte';
	import SongItem from '$lib/components/Hub/Shared/SongItem.svelte';

	export let playlists = [];
	export let loadingPlaylists = false;
	export let allSongs = [];
	export let onSelectPlaylist;
	export let selectedPlaylist = null;

	$: recommendedPlaylists = playlists.filter(p => p.playlistId.startsWith('reco-'));
	$: jdmoPlaylists = playlists.filter(p => !p.playlistId.startsWith('reco-'));

	let searchQuery = '';
	let currentPage = 1;
	const songsPerPage = 12;

	$: resolvedSongs = selectedPlaylist
		? selectedPlaylist.songs
				.map((mapName) => allSongs.find((s) => s.mapName.toLowerCase() === mapName.toLowerCase()))
				.filter(Boolean)
		: [];

	$: filteredSongs = searchQuery.trim()
		? resolvedSongs.filter(
				(s) =>
					s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					s.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
					s.mapName.toLowerCase().includes(searchQuery.toLowerCase())
		  )
		: resolvedSongs;

	$: totalPages = Math.max(1, Math.ceil(filteredSongs.length / songsPerPage));
	$: { filteredSongs; currentPage = 1; }
	$: pageSongs = filteredSongs.slice(
		(currentPage - 1) * songsPerPage,
		currentPage * songsPerPage
	);

	function goToPage(p) {
		if (p >= 1 && p <= totalPages) currentPage = p;
	}
	function clearSearch() { searchQuery = ''; }

	let coverErrors = {};
	function onCoverError(id) { coverErrors = { ...coverErrors, [id]: true }; }
	let coverLoaded = {};
	function onCoverLoad(id) { coverLoaded = { ...coverLoaded, [id]: true }; }

	$: { selectedPlaylist; searchQuery = ''; currentPage = 1; }

	// ── Stacked cover helpers ──────────────────────────────────────────────────

	/** RRGGBBAA hex string → CSS rgba() */
	function rrggbbaa(hex, fallback = 'rgba(139,92,246,0.85)') {
		if (!hex || hex.length < 8) return fallback;
		const r = parseInt(hex.slice(0, 2), 16);
		const g = parseInt(hex.slice(2, 4), 16);
		const b = parseInt(hex.slice(4, 6), 16);
		const a = (parseInt(hex.slice(6, 8), 16) / 255).toFixed(3);
		return `rgba(${r},${g},${b},${a})`;
	}

	function needsStackedCover(playlist) {
		return !playlist.cover || coverErrors[playlist.playlistId];
	}

	/** Up to `count` resolved songs that have assets.cover */
	function getStackSongs(playlist, count = 5) {
		return playlist.songs
			.map((mapName) => allSongs.find((s) => s.mapName.toLowerCase() === mapName.toLowerCase()))
			.filter((s) => s?.assets?.cover)
			.slice(0, count);
	}
</script>

<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6">

	{#if loadingPlaylists}
		<div class="text-center py-16">
			<Loader2 class="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
			<p class="text-gray-400">Loading playlists...</p>
		</div>

	{:else if !selectedPlaylist}
		{#if playlists.length === 0}
			<div class="text-center py-16">
				<div class="w-20 h-20 mx-auto mb-4 bg-gray-700/50 rounded-full flex items-center justify-center">
					<ListMusic class="w-10 h-10 text-gray-400" />
				</div>
				<h3 class="text-xl font-semibold text-gray-300 mb-2">No playlists available</h3>
				<p class="text-gray-400">Please check back later.</p>
			</div>
		{:else}
			<!-- ── Recommendations ── -->
			{#if recommendedPlaylists.length > 0}
				<div class="flex items-center gap-3 mb-4">
					<h3 class="text-sm font-bold text-gray-300 uppercase tracking-wider">Recommendations</h3>
				</div>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
					{#each recommendedPlaylists as playlist (playlist.playlistId)}
						<button
							class="group relative bg-gray-700/30 border border-gray-600/50 rounded-2xl overflow-hidden hover:border-purple-400/50 transition-all duration-300 text-left flex flex-col"
							on:click={() => onSelectPlaylist(playlist)}
						>
							<div class="relative w-full aspect-[1024/512] bg-gray-800 overflow-hidden flex-shrink-0">

								{#if needsStackedCover(playlist)}
									{@const stackSongs = getStackSongs(playlist)}
									{@const c1 = rrggbbaa(playlist.colors?.baseColor)}
									{@const c2 = rrggbbaa(playlist.colors?.gradColor)}

									{#if stackSongs.length > 0}
										<!-- Sliced song artworks side-by-side -->
										<div class="absolute inset-0 flex">
											{#each stackSongs as song}
												<div class="relative flex-1 overflow-hidden">
													<img
														src={song.assets.cover}
														alt=""
														aria-hidden="true"
														class="absolute top-0 left-0 h-full w-full object-cover pointer-events-none select-none group-hover:scale-105 transition-transform duration-500"
														loading="lazy"
													/>
												</div>
											{/each}
										</div>
									{:else}
										<div class="absolute inset-0 flex items-center justify-center"
											style="background: linear-gradient(135deg, {c1}, {c2});">
											<Music class="w-10 h-10 text-white/30" />
										</div>
									{/if}

									<!-- Per-playlist gradient colour overlay -->
									<div
										class="absolute inset-0 pointer-events-none"
										style="background: linear-gradient(100deg, {c1} 0%, {c2} 100%); opacity: 0.72;"
									></div>

									<!-- Title label over the stacked cover -->
									<div class="absolute bottom-0 left-0 right-0 px-3 py-2 z-10">
										<p class="text-white text-xs font-bold drop-shadow truncate">{playlist.title}</p>
									</div>

								{:else}
									{#if !coverLoaded[playlist.playlistId]}
										<div class="absolute inset-0 flex items-center justify-center">
											<Loader2 class="w-6 h-6 text-purple-400 animate-spin" />
										</div>
									{/if}
									<img
										src={playlist.cover}
										alt="{playlist.title} cover"
										class="w-full h-full object-cover transition-opacity duration-300 {coverLoaded[playlist.playlistId] ? 'opacity-100' : 'opacity-0'} group-hover:scale-105 transition-transform"
										loading="lazy"
										on:load={() => onCoverLoad(playlist.playlistId)}
										on:error={() => onCoverError(playlist.playlistId)}
									/>
								{/if}
							</div>

							<div class="p-4 flex flex-col flex-1">
								<h4 class="font-semibold text-white text-sm leading-tight mb-1 line-clamp-2">{playlist.title}</h4>
								<p class="text-xs text-gray-400 line-clamp-2 flex-1">{playlist.description}</p>
								<div class="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
									<Music class="w-3 h-3" />
									<span>{playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}</span>
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}

			<!-- ── Just Dance Melody Online ── -->
			{#if jdmoPlaylists.length > 0}
				<div class="flex items-center gap-3 mb-4">
					<h3 class="text-sm font-bold text-gray-300 uppercase tracking-wider">Just Dance Melody Online</h3>
				</div>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{#each jdmoPlaylists as playlist (playlist.playlistId)}
						<button
							class="group relative bg-gray-700/30 border border-gray-600/50 rounded-2xl overflow-hidden hover:border-purple-400/50 transition-all duration-300 text-left flex flex-col"
							on:click={() => onSelectPlaylist(playlist)}
						>
							<div class="relative w-full aspect-[1024/512] bg-gray-800 overflow-hidden flex-shrink-0">

								{#if needsStackedCover(playlist)}
									{@const stackSongs = getStackSongs(playlist)}
									{@const c1 = rrggbbaa(playlist.colors?.baseColor)}
									{@const c2 = rrggbbaa(playlist.colors?.gradColor)}

									{#if stackSongs.length > 0}
										<!-- Sliced song artworks side-by-side -->
										<div class="absolute inset-0 flex">
											{#each stackSongs as song}
												<div class="relative flex-1 overflow-hidden">
													<img
														src={song.assets.cover}
														alt=""
														aria-hidden="true"
														class="absolute top-0 left-0 h-full w-full object-cover pointer-events-none select-none group-hover:scale-105 transition-transform duration-500"
														loading="lazy"
													/>
												</div>
											{/each}
										</div>
									{:else}
										<div class="absolute inset-0 flex items-center justify-center"
											style="background: linear-gradient(135deg, {c1}, {c2});">
											<Music class="w-10 h-10 text-white/30" />
										</div>
									{/if}

									<!-- Per-playlist gradient colour overlay -->
									<div
										class="absolute inset-0 pointer-events-none"
										style="background: linear-gradient(100deg, {c1} 0%, {c2} 100%); opacity: 0.72;"
									></div>

									<!-- Title label over the stacked cover -->
									<div class="absolute bottom-0 left-0 right-0 px-3 py-2 z-10">
										<p class="text-white text-xs font-bold drop-shadow truncate">{playlist.title}</p>
									</div>

								{:else}
									{#if !coverLoaded[playlist.playlistId]}
										<div class="absolute inset-0 flex items-center justify-center">
											<Loader2 class="w-6 h-6 text-purple-400 animate-spin" />
										</div>
									{/if}
									<img
										src={playlist.cover}
										alt="{playlist.title} cover"
										class="w-full h-full object-cover transition-opacity duration-300 {coverLoaded[playlist.playlistId] ? 'opacity-100' : 'opacity-0'} group-hover:scale-105 transition-transform"
										loading="lazy"
										on:load={() => onCoverLoad(playlist.playlistId)}
										on:error={() => onCoverError(playlist.playlistId)}
									/>
								{/if}
							</div>

							<div class="p-4 flex flex-col flex-1">
								<h4 class="font-semibold text-white text-sm leading-tight mb-1 line-clamp-2">{playlist.title}</h4>
								<p class="text-xs text-gray-400 line-clamp-2 flex-1">{playlist.description}</p>
								<div class="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
									<Music class="w-3 h-3" />
									<span>{playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}</span>
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		{/if}

	{:else}
		<!-- ── Playlist detail ── -->
		<div class="flex items-start gap-4 mb-6">
			<button
				class="flex-shrink-0 flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors mt-0.5"
				on:click={() => onSelectPlaylist(null)}
			>
				<ChevronLeft class="w-4 h-4" />
				Back
			</button>

			<div class="w-20 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-700/50 border border-gray-600/50">
				{#if needsStackedCover(selectedPlaylist)}
					{@const stackSongs = getStackSongs(selectedPlaylist)}
					{@const c1 = rrggbbaa(selectedPlaylist.colors?.baseColor)}
					{@const c2 = rrggbbaa(selectedPlaylist.colors?.gradColor)}
					<div class="relative w-full h-full overflow-hidden">
						{#if stackSongs.length > 0}
							<div class="absolute inset-0 flex">
								{#each stackSongs as song}
									<div class="relative flex-1 overflow-hidden">
										<img
											src={song.assets.cover}
											alt=""
											aria-hidden="true"
											class="absolute top-0 left-0 h-full w-full object-cover pointer-events-none select-none"
											loading="lazy"
										/>
									</div>
								{/each}
							</div>
						{:else}
							<div class="absolute inset-0" style="background: linear-gradient(135deg, {c1}, {c2});"></div>
						{/if}
						<div class="absolute inset-0" style="background: linear-gradient(100deg, {c1} 0%, {c2} 100%); opacity: 0.72;"></div>
					</div>
				{:else if !coverErrors[selectedPlaylist.playlistId]}
					<img
						src={selectedPlaylist.cover}
						alt="{selectedPlaylist.title} cover"
						class="w-full h-full object-cover"
						on:error={() => onCoverError(selectedPlaylist.playlistId)}
					/>
				{:else}
					<div class="w-full h-full flex items-center justify-center">
						<Music class="w-6 h-6 text-gray-500" />
					</div>
				{/if}
			</div>

			<div class="flex-1 min-w-0">
				<h3 class="font-bold text-white text-lg leading-tight truncate">{selectedPlaylist.title}</h3>
				<p class="text-xs text-gray-400 mt-0.5 line-clamp-2">{selectedPlaylist.description}</p>
				<span class="text-xs text-gray-500 mt-1 inline-block">{resolvedSongs.length} song{resolvedSongs.length !== 1 ? 's' : ''}</span>
			</div>
		</div>

		<div class="relative mb-4">
			<Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
			<input
				type="text"
				placeholder="Search in playlist..."
				bind:value={searchQuery}
				class="w-full pl-11 pr-10 py-2.5 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white text-sm placeholder-gray-400 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all"
			/>
			{#if searchQuery}
				<button
					on:click={clearSearch}
					class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>

		{#if resolvedSongs.length === 0}
			<div class="text-center py-12">
				<div class="w-16 h-16 mx-auto mb-3 bg-gray-700/50 rounded-full flex items-center justify-center">
					<Music class="w-8 h-8 text-gray-400" />
				</div>
				<p class="text-gray-400 text-sm">No song data found for this playlist.<br>The songs may not be in the loaded song database.</p>
			</div>
		{:else if filteredSongs.length === 0}
			<div class="text-center py-12">
				<p class="text-gray-400 text-sm">No songs match "{searchQuery}"</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto overscroll-contain pr-1 mb-4">
				{#each pageSongs as song (song.mapName)}
					<SongItem {song} />
				{/each}
			</div>

			{#if totalPages > 1}
				<div class="flex flex-wrap items-center justify-between gap-3 bg-gray-700/30 border border-gray-600/50 rounded-2xl p-3">
					<button
						on:click={() => goToPage(currentPage - 1)}
						disabled={currentPage === 1}
						class="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-50 border border-gray-600/50 rounded-xl text-white text-sm transition-all disabled:cursor-not-allowed"
					>
						<ChevronLeft class="w-4 h-4" />
						Previous
					</button>
					<div class="text-sm text-gray-400">
						Page {currentPage} of {totalPages}
						<span class="text-xs text-gray-500 ml-1">
							({(currentPage - 1) * songsPerPage + 1}–{Math.min(currentPage * songsPerPage, filteredSongs.length)} of {filteredSongs.length})
						</span>
					</div>
					<button
						on:click={() => goToPage(currentPage + 1)}
						disabled={currentPage === totalPages}
						class="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-50 border border-gray-600/50 rounded-xl text-white text-sm transition-all disabled:cursor-not-allowed"
					>
						Next
						<ChevronRight class="w-4 h-4" />
					</button>
				</div>
			{/if}

			{#if searchQuery.trim()}
				<div class="mt-3 bg-blue-500/20 border border-blue-400/30 rounded-xl p-3 text-center">
					<p class="text-blue-400 text-sm">{filteredSongs.length} song{filteredSongs.length !== 1 ? 's' : ''} found for "{searchQuery}"</p>
				</div>
			{/if}
		{/if}
	{/if}
</div>