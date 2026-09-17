<script>
	import { Loader2 } from 'lucide-svelte';
	import SongBadge from './SongBadge.svelte';

	export let song;

	let loaded = false;
	let errored = false;

	// Reset load state when the song changes (e.g. pagination)
	$: { song; loaded = false; errored = false; }

	function onLoad() { loaded = true; }
	function onError() { loaded = true; errored = true; }
</script>

<!-- Fixed-height card: h-24 so badges/long titles never push layout -->
<div class="relative p-3 rounded-2xl border bg-gray-700/50 border-gray-600/50 h-24 overflow-hidden">
	<div class="flex items-center gap-3 h-full">

		<!-- Cover with spinner -->
		<div class="w-16 h-16 rounded-xl flex-shrink-0 border-2 border-gray-600/50 overflow-hidden relative bg-gray-600/50">
			{#if !loaded}
				<div class="absolute inset-0 flex items-center justify-center">
					<Loader2 class="w-5 h-5 text-purple-400 animate-spin" />
				</div>
			{/if}
			{#if !errored}
				<img
					src={song.assets.cover}
					alt="{song.title} cover"
					class="w-full h-full object-cover transition-opacity duration-300 {loaded ? 'opacity-100' : 'opacity-0'}"
					loading="lazy"
					on:load={onLoad}
					on:error={onError}
				/>
			{:else}
				<div class="w-full h-full flex items-center justify-center bg-gray-700/50">
					<span class="text-gray-500 text-xs text-center px-1 leading-tight">No image</span>
				</div>
			{/if}
		</div>

		<!-- Text + badges -->
		<div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
			<h3 class="font-semibold text-white text-sm truncate leading-tight">{song.title}</h3>
			<p class="text-xs text-gray-400 truncate leading-tight">{song.artist}</p>
			<div class="flex gap-1 overflow-hidden">
				<div class="flex gap-1 overflow-hidden">
					<SongBadge {song} textClass="text-[10px]" />
				</div>
			</div>
		</div>
	</div>
</div>