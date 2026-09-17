<script>
	import { Loader2 } from 'lucide-svelte';
	import SongBadge from '../Shared/SongBadge.svelte';

	export let selectedSong;
	export let selectedPlatform;
	export let versions = [];

	let coverLoaded = false;
	let coverError = false;

	// Reset load state whenever the song changes
	$: { selectedSong; coverLoaded = false; coverError = false; }
</script>

{#if selectedSong}
	<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6">
		<div class="flex items-center gap-4">

			<!-- Cover with spinner — matches SongItem aesthetic -->
			<div class="w-20 h-20 rounded-2xl flex-shrink-0 border-2 border-gray-600/50 overflow-hidden relative bg-gray-600/50">
				{#if !coverLoaded}
					<div class="absolute inset-0 flex items-center justify-center">
						<Loader2 class="w-6 h-6 text-purple-400 animate-spin" />
					</div>
				{/if}
				{#if !coverError}
					<img
						src={selectedSong.assets.cover}
						alt="{selectedSong.title} cover"
						class="w-full h-full object-cover transition-opacity duration-300 {coverLoaded ? 'opacity-100' : 'opacity-0'}"
						on:load={() => { coverLoaded = true; }}
						on:error={() => { coverLoaded = true; coverError = true; }}
					/>
				{:else}
					<div class="w-full h-full flex items-center justify-center">
						<span class="text-gray-500 text-xs text-center px-1 leading-tight">No image</span>
					</div>
				{/if}
			</div>

			<!-- Song info -->
			<div class="flex-1 min-w-0">
				<h2 class="text-xl font-bold text-white leading-tight truncate">{selectedSong.title}</h2>
				<p class="text-gray-400 text-sm mb-2 truncate">by {selectedSong.artist}</p>

				<!-- Badges row -->
				<div class="flex flex-wrap gap-1.5">
					<span class="px-2 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded-lg text-blue-400 text-xs">
						{versions.find((v) => Number(v.jdVersion) === Number(selectedSong.jdVersion))?.name ?? 'Unknown game'}
					</span>
					{#if selectedPlatform?.id !== 'all'}
						<span class="px-2 py-0.5 bg-green-500/20 border border-green-400/30 rounded-lg text-green-400 text-xs">
							{selectedPlatform.name}
						</span>
					{/if}
					<!-- call songbadge for every possible badge type -->
					<SongBadge song={selectedSong} />
				</div>
			</div>
		</div>
	</div>
{/if}