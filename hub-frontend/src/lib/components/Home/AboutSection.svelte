<script>
	import { fade } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import consoles from '$lib/consoles';
	import Loader from '$lib/components/Loader.svelte';

	/** @type {import('$lib/api').Stats | null} */
	export let stats = null;

	/** @type {Array<import('$lib/api').Song>} */
	export let carouselSongs = [];

	/** @type {boolean} */
	export let loading = true;
</script>

<section
	id="info"
	class="relative py-32 bg-gradient-to-br from-gray-900 via-violet-900/20 to-gray-900 text-white overflow-hidden"
>
	<!-- Section Header -->
	<div class="text-center mb-10 px-6 md:px-12">
		<h2
			class="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent"
		>
			About
		</h2>
		<div
			class="w-32 h-1 bg-gradient-to-r from-violet-500 to-purple-500 mx-auto rounded-full mb-8"
		></div>
		<p class="text-xl text-gray-300 max-w-5xl mx-auto leading-relaxed">
			Just Dance Melody Online is a streaming service that gives players access to an ever-growing
			catalog of songs.
			<br />
			From chart-topping hits to all-time classics, new tracks are added all year long! There's a song
			for everyone and every moment. Just Dance Melody Online supports a wide variety of platforms so
			you never have to miss a beat!
		</p>
	</div>

	<div class="relative z-10 container mx-auto px-6 md:px-12 max-w-6xl">
		<!-- Platform Icons -->
		<div class="flex flex-wrap items-center justify-center gap-5 my-12">
			{#each ['pc', 'ps4', 'ps5', 'nx', 'nx2', 'wiiu'] as platformId}
				{@const platform = consoles[platformId]}
				<div
					class="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 min-w-fit"
				>
					<div class="flex items-center justify-center h-6 w-auto">
						{#if platformId === 'nx2'}
							<img src="/assets/icons/nx2.png" alt="Switch 2" class="h-6 w-auto object-contain" />
						{:else if platformId === 'nx'}
							<img src="/assets/icons/nx.png" alt="Switch" class="h-6 w-auto object-contain" />
						{:else}
							<Icon icon={platform.icon} class="text-2xl" />
						{/if}
					</div>
					<span class="text-sm text-gray-300 leading-none">{platform.title}</span>
				</div>
			{/each}
		</div>

		{#if loading}
			<div class="flex justify-center py-16">
				<Loader />
			</div>
		{:else}
			<div in:fade={{ duration: 400 }}>
				<!-- Stats -->
				<div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
					<div
						class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center"
					>
						<p
							class="text-3xl md:text-4xl font-black text-transparent bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text"
						>
							{stats?.songCount?.toLocaleString() ?? '...'}
						</p>
						<p class="text-sm text-gray-400 mt-1">Songs</p>
					</div>
					<div
						class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center"
					>
						<p
							class="text-3xl md:text-4xl font-black text-transparent bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text"
						>
							{stats?.playerCount?.toLocaleString() ?? '...'}
						</p>
						<p class="text-sm text-gray-400 mt-1">Players</p>
					</div>
					<div
						class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center"
					>
						<p
							class="text-3xl md:text-4xl font-black text-transparent bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text"
						>
							{stats?.songsPlayed?.toLocaleString() ?? '...'}
						</p>
						<p class="text-sm text-gray-400 mt-1">Songs Played</p>
					</div>
					<div
						class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center"
					>
						<p
							class="text-3xl md:text-4xl font-black text-transparent bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text"
						>
							{stats?.livePlayers?.toLocaleString() ?? '...'}
						</p>
						<p class="text-sm text-gray-400 mt-1">Online Now</p>
					</div>
				</div>

				<!-- Song Carousel -->
				{#if carouselSongs.length > 0}
					<div class="text-center mb-10">
						<h2 class="text-3xl md:text-5xl font-black mb-2">
							<span class="text-white">Dance to</span>
						</h2>
					</div>

					<div class="carousel-wrapper">
						<div class="carousel-track flex gap-4">
							{#each [...carouselSongs, ...carouselSongs] as song, i}
								<div class="flex-shrink-0 w-44 md:w-52">
									<div class="bg-white/5 rounded-2xl overflow-hidden border border-white/10">
										<img
											src={song.assets?.cover}
											alt={song.title}
											class="w-full aspect-square object-cover"
										/>
										<div class="p-3">
											<p class="text-sm font-semibold text-white truncate">{song.title}</p>
											<p class="text-xs text-gray-400 truncate">{song.artist}</p>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>

					<div class="text-center mt-8">
						<a
							href="/hub/songs"
							class="text-gray-400 hover:text-white text-lg transition-colors duration-200"
						>
							and many more! <span class="text-purple-400">→</span>
						</a>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</section>

<style>
	.carousel-wrapper {
		position: relative;
		overflow: hidden;
	}

	@media (min-width: 768px) {
		.carousel-wrapper {
			-webkit-mask-image: linear-gradient(
				to right,
				transparent 0%,
				black 5%,
				black 95%,
				transparent 100%
			);
			mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
		}
	}

	.carousel-track {
		animation: scroll-track 200s linear infinite;
		width: max-content;
	}

	@keyframes scroll-track {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-50%);
		}
	}
</style>
