<script lang="ts">
	import { fetchApi } from "$lib/api";
	import { onMount } from "svelte";
	import {
		Search,
		Music,
		Image as ImageIcon,
		Play,
		Download,
		Copy,
		ExternalLink,
		FileCode,
		ChevronRight,
		Filter,
		Box
	} from "lucide-svelte";
	import { toast } from "$lib/toast";
	import { getSongThumbnail, resolveUrl } from "$lib/utils";

	let songs: any[] = $state([]);
	let filteredSongs = $derived(
		songs.filter(s => 
			(s.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
			(s.mapName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
			(s.artist || '').toLowerCase().includes(searchQuery.toLowerCase())
		)
	);
	
	let loading = $state(true);
	let searchQuery = $state("");
	let selectedSong: any = $state(null);
	
	onMount(async () => {
		try {
			// Fetch all songs for the list (high limit to ensure we get everything)
			const res = await fetchApi<{ items: any[] }>(`manage-songs/list?limit=9999`);
			songs = res.items || [];
			if (songs.length > 0) {
				selectedSong = songs[0];
			}
		} catch (e: any) {
			toast.error("Failed to load songs: " + e.message);
		} finally {
			loading = false;
		}
	});

	function selectSong(song: any) {
		selectedSong = song;
	}

	interface Asset {
		key: string;
		url: string;
		type: 'image' | 'audio' | 'video' | 'package' | 'other';
		platform?: string;
		category: string;
	}

	function getAssetType(url: string): Asset['type'] {
		const lowerUrl = url.toLowerCase();
		if (lowerUrl.endsWith('.ckd') || lowerUrl.endsWith('.tga')) return 'other';
		
		const ext = url.split('.').pop()?.toLowerCase();
		if (['png', 'jpg', 'jpeg', 'webp'].some(e => url.includes(e))) return 'image';
		if (['ogg', 'wav', 'mp3'].includes(ext || '')) return 'audio';
		if (['webm', 'mp4'].includes(ext || '')) return 'video';
		if (['zip', 'rar', '7z'].includes(ext || '')) return 'package';
		return 'other';
	}

	function extractAssets(song: any): Asset[] {
		if (!song) return [];
		const assets: Asset[] = [];

		// Extract from 'assets' (nested by platform)
		if (song.assets) {
			Object.entries(song.assets).forEach(([platform, platformAssets]: [string, any]) => {
				if (typeof platformAssets === 'object') {
					Object.entries(platformAssets).forEach(([key, url]: [string, any]) => {
						if (typeof url === 'string' && url.length > 0) {
							assets.push({
								key,
								url,
								type: getAssetType(url),
								platform,
								category: 'Assets'
							});
						}
					});
				} else if (typeof platformAssets === 'string' && platformAssets.length > 0) {
					// Top level asset like phoneCoverImageUrl
					assets.push({
						key: platform,
						url: platformAssets,
						type: getAssetType(platformAssets),
						category: 'Assets'
					});
				}
			});
		}

		// Extract from 'urls'
		if (song.urls) {
			Object.entries(song.urls).forEach(([key, url]: [string, any]) => {
				if (typeof url === 'string') {
					assets.push({
						key,
						url,
						type: getAssetType(url),
						category: 'Raw URLs'
					});
				}
			});
		}

		// Extract from 'packages'
		if (song.packages) {
			Object.entries(song.packages).forEach(([platform, pkg]: [string, any]) => {
				if (pkg?.url) {
					assets.push({
						key: 'MAIN_SCENE',
						url: pkg.url,
						type: 'package',
						platform,
						category: 'Packages'
					});
				}
			});
		}

		// Audio Preview
		if (song.audioPreviewData?.url) {
			assets.push({
				key: 'Audio Preview',
				url: song.audioPreviewData.url,
				type: 'audio',
				category: 'Audio'
			});
		}

		return assets;
	}

	let currentAssets = $derived(extractAssets(selectedSong));
	
	let filterType = $state('all');
	let filteredAssets = $derived(
		currentAssets.filter(a => filterType === 'all' || a.type === filterType)
	);

	let groupedAssets = $derived.by(() => {
		const groups: Record<string, Asset[]> = {};
		for (const asset of filteredAssets) {
			const plat = asset.platform || 'Global';
			if (!groups[plat]) groups[plat] = [];
			groups[plat].push(asset);
		}
		return groups;
	});

	function copyUrl(url: string) {
		navigator.clipboard.writeText(url);
		toast.success("URL copied to clipboard");
	}

	function downloadAsset(url: string) {
		window.open(url, '_blank');
	}

	const typeIcons = {
		image: ImageIcon,
		audio: Music,
		video: Play,
		package: Box,
		other: FileCode
	};
</script>

<div class="flex h-[calc(100vh-100px)] gap-6 overflow-hidden">
	<!-- Left Sidebar: Song List -->
	<div class="w-80 flex flex-col bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl">
		<div class="p-4 border-b border-slate-800 space-y-4">
			<h2 class="text-xl font-black text-white px-2">Songs</h2>
			<div class="relative">
				<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
				<input
					bind:value={searchQuery}
					type="text"
					placeholder="Filter songs..."
					class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-indigo-500 transition-all"
				/>
			</div>
		</div>
		
		<div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
			{#if loading}
				{#each Array(10) as _}
					<div class="h-14 bg-slate-800/20 animate-pulse rounded-xl"></div>
				{/each}
			{:else}
				{#each filteredSongs as song (song.mapName)}
					<button
						onclick={() => selectSong(song)}
						class="w-full flex items-center gap-3 p-2 rounded-xl transition-all group {selectedSong?.mapName === song.mapName ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}"
					>
						<div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-950 border border-white/5">
							{#if getSongThumbnail(song)}
								<img src={getSongThumbnail(song)} class="w-full h-full object-cover" alt="" />
							{:else}
								<div class="w-full h-full flex items-center justify-center">
									<Music class="w-4 h-4" />
								</div>
							{/if}
						</div>
						<div class="flex-1 text-left truncate">
							<div class="text-xs font-bold truncate">{song.title || song.mapName}</div>
							<div class="text-[10px] opacity-60 truncate">{song.artist || 'Unknown'}</div>
						</div>
						<ChevronRight class="w-4 h-4 opacity-0 group-hover:opacity-40" />
					</button>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Right Content: Asset Grid -->
	<div class="flex-1 flex flex-col min-w-0">
		{#if selectedSong}
			<div class="bg-slate-900/40 border border-slate-800 rounded-3xl flex-1 flex flex-col overflow-hidden backdrop-blur-xl">
				<!-- Asset Header -->
				<div class="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div class="flex items-center gap-4">
						<div class="w-16 h-16 rounded-2xl overflow-hidden border-2 border-indigo-500/20 shadow-2xl">
							{#if getSongThumbnail(selectedSong)}
								<img src={getSongThumbnail(selectedSong)} class="w-full h-full object-cover" alt="" />
							{:else}
								<div class="w-full h-full flex items-center justify-center bg-slate-950">
									<Music class="w-8 h-8 text-slate-700" />
								</div>
							{/if}
						</div>
						<div>
							<h1 class="text-2xl font-black text-white">{selectedSong.title || selectedSong.mapName}</h1>
							<p class="text-slate-500 text-xs font-bold uppercase tracking-widest">{selectedSong.artist} • {selectedSong.mapName}</p>
						</div>
					</div>

					<div class="flex items-center gap-2 bg-slate-950/50 p-1 rounded-xl border border-slate-800">
						{#each ['all', 'image', 'audio', 'video', 'package'] as type}
							<button
								onclick={() => filterType = type}
								class="px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all {filterType === type ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}"
							>
								{type}
							</button>
						{/each}
					</div>
				</div>

				<!-- Asset Grid -->
				<div class="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
					{#each Object.entries(groupedAssets) as [platform, assets]}
						<details class="space-y-4 group">
							<summary class="text-sm font-black text-indigo-400 uppercase tracking-[0.2em] border-b border-slate-800/50 pb-2 flex items-center gap-2 cursor-pointer hover:text-indigo-300 transition-colors list-none select-none">
								<ChevronRight class="w-4 h-4 transition-transform group-open:rotate-90" />
								<Box class="w-4 h-4" /> {platform} <span class="text-[10px] text-slate-500 ml-auto lowercase">({assets.length} assets)</span>
							</summary>
							<div class="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4 pt-4">
								{#each assets as asset}
									{#if ['image', 'video', 'audio'].includes(asset.type)}
										<div class="group/asset bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col hover:border-indigo-500/30 transition-all">
											<!-- Preview Area -->
											<div class="aspect-video relative bg-black/40 overflow-hidden flex items-center justify-center border-b border-slate-800">
												{#if asset.type === 'image'}
													<img 
														src={resolveUrl(asset.url)} 
														class="w-full h-full object-contain group-hover/asset:scale-105 transition-transform duration-500" 
														alt=""
														onerror={(e) => e.currentTarget.src = 'https://via.placeholder.com/400x225?text=Image+Load+Failed'}
													/>
												{:else if asset.type === 'audio'}
													<div class="flex flex-col items-center gap-4">
														<div class="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover/asset:scale-110 transition-transform">
															<Music size={32} />
														</div>
														<audio controls class="h-8 w-48 opacity-60 hover:opacity-100 transition-opacity">
															<source src={resolveUrl(asset.url)} type="audio/ogg" />
														</audio>
													</div>
												{:else if asset.type === 'video'}
													<video controls class="w-full h-full object-contain">
														<source src={resolveUrl(asset.url)} type="video/webm" />
													</video>
												{/if}

												<!-- Platform Badge -->
												{#if asset.platform}
													<div class="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-widest text-indigo-400">
														{asset.platform}
													</div>
												{/if}
												
												<!-- Category Badge -->
												<div class="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
													{asset.category}
												</div>
											</div>

											<!-- Info Area -->
											<div class="p-4 space-y-3">
												<div class="space-y-1">
													<div class="text-xs font-black text-white truncate">{asset.key}</div>
													<div class="text-[10px] font-mono text-slate-500 truncate" title={asset.url}>{asset.url}</div>
												</div>

												<div class="flex items-center gap-2">
													<button 
														onclick={() => copyUrl(resolveUrl(asset.url))}
														class="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-[10px] font-bold transition-all border border-slate-800"
													>
														<Copy size={12} /> Copy
													</button>
													<button 
														onclick={() => downloadAsset(resolveUrl(asset.url))}
														class="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl text-[10px] font-bold transition-all border border-indigo-500/20"
													>
														<Download size={12} /> Download
													</button>
													<a 
														href={resolveUrl(asset.url)} 
														target="_blank"
														class="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-all"
													>
														<ExternalLink size={12} />
													</a>
												</div>
											</div>
										</div>
									{:else}
										<!-- Compact List Item for non-viewable assets -->
										<div class="group/asset col-span-full bg-slate-950/50 border border-slate-800 rounded-xl overflow-hidden flex items-center p-3 gap-4 hover:border-indigo-500/30 transition-all">
											<div class="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover/asset:text-indigo-400 transition-colors shrink-0">
												<svelte:component this={typeIcons[asset.type]} size={20} />
											</div>
											<div class="flex-1 min-w-0">
												<div class="text-sm font-black text-white truncate">{asset.key}</div>
												<div class="text-[10px] font-mono text-slate-500 truncate" title={asset.url}>{asset.url}</div>
											</div>
											<div class="flex items-center gap-2 shrink-0">
												<div class="hidden sm:block px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[9px] font-black uppercase text-slate-400 mr-2">
													{asset.category}
												</div>
												<button 
													onclick={() => copyUrl(resolveUrl(asset.url))}
													class="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-800"
													title="Copy URL"
												>
													<Copy size={14} />
												</button>
												<button 
													onclick={() => downloadAsset(resolveUrl(asset.url))}
													class="flex items-center gap-2 px-3 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg transition-all border border-indigo-500/20 text-[10px] font-bold"
													title="Download"
												>
													<Download size={14} /> <span class="hidden sm:inline">Download</span>
												</button>
											</div>
										</div>
									{/if}
								{/each}
							</div>
						</details>
					{/each}

					{#if filteredAssets.length === 0}
						<div class="flex flex-col items-center justify-center h-full py-20 text-slate-500">
							<Filter size={48} class="mb-4 opacity-20" />
							<p class="font-bold">No assets found for this filter</p>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="bg-slate-900/40 border border-slate-800 rounded-3xl flex-1 flex flex-col items-center justify-center backdrop-blur-xl text-slate-500">
				<Box size={64} class="mb-4 opacity-10" />
				<p class="text-lg font-bold">Select a song to explore assets</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #1e293b;
		border-radius: 10px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: #334155;
	}

	:global(body) {
		overflow: hidden;
	}
</style>
