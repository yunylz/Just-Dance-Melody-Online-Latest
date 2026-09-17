<script lang="ts">
	import { onMount } from "svelte";
	import { fetchApi } from "$lib/api";
	import {
		PlayCircle,
		Plus,
		Edit2,
		Trash2,
		Search,
		RefreshCw,
		Info,
		Languages,
		ChevronRight,
		Palette,
		Map as MapIcon,
		Globe,
		Lock,
		Image as ImageIcon,
		ExternalLink,
		Pin,
		CheckCircle2,
		XCircle,
		Music,
		ArrowUp,
		ArrowDown
	} from "lucide-svelte";
	import JsonEditor from "$lib/components/JsonEditor.svelte";
	import { triggerRefresh } from "$lib/jmcs";
	import PageHeader from "$lib/components/PageHeader.svelte";
	import { resolveUrl, getSongThumbnail } from "$lib/utils";

	// --- State ---
	let items = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchQuery = $state("");

	let showModal = $state(false);
	let modalMode = $state<"create" | "edit">("create");
	let currentItem = $state<any>(null);
	let saving = $state(false);

	let locPreviews = $state<Record<number, string>>({});
	let allSongs = $state<any[]>([]);
	let songMap = $state<Record<string, any>>({});
	let songSearchQuery = $state("");

	// --- Data Fetching ---
	async function loadSongs() {
		try {
			const res = await fetchApi<any>("manage-songs/list?limit=10000");
			allSongs = res.items || [];
			const map: Record<string, any> = {};
			allSongs.forEach(s => map[s.mapName] = s);
			songMap = map;
		} catch (e) {
			console.error("Failed to load songs for picker:", e);
		}
	}
	async function loadData() {
		loading = true;
		error = null;
		try {
			const res = await fetchApi<any>("manage-playlists/list");
			items = res.items || [];
			
			const locIds = new Set<number>();
			items.forEach(item => {
				if (item.titleId) locIds.add(item.titleId);
				if (item.descriptionId) locIds.add(item.descriptionId);
			});
			
			if (locIds.size > 0) fetchLocPreviews(Array.from(locIds));
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	async function fetchLocPreviews(ids: number[]) {
		try {
			const toFetch = ids.filter(id => !locPreviews[id]);
			if (toFetch.length === 0) return;

			const res = await fetchApi<any>(`manage-locs/list?limit=1000`); 
			if (res && res.items) {
				const newPreviews = { ...locPreviews };
				res.items.forEach((loc: any) => {
					if (ids.includes(Number(loc.locId))) {
						newPreviews[Number(loc.locId)] = loc.strings?.en || `Loc ${loc.locId}`;
					}
				});
				locPreviews = newPreviews;
			}
		} catch (e) {
			console.error("Failed to fetch loc previews:", e);
		}
	}

	onMount(() => {
		loadData();
		loadSongs();
	});

	// --- Actions ---
	function openCreate() {
		modalMode = "create";
		currentItem = {
			playlistId: "",
			titleId: 0,
			descriptionId: 0,
			maps: [],
			type: "curated",
			covers: { en: "" },
			fixedMapOrder: false,
			pinned: false,
			colors: {
				base_color: "FF00FFFF",
				grad_color: "00FFFFFF"
			}
		};
		showModal = true;
	}

	function openEdit(item: any) {
		modalMode = "edit";
		currentItem = JSON.parse(JSON.stringify(item));
		// Ensure nested objects exist to avoid template errors
		if (!currentItem.colors) {
			currentItem.colors = { base_color: "FF00FFFF", grad_color: "00FFFFFF" };
		}
		if (!currentItem.covers) {
			currentItem.covers = { en: "" };
		}
		showModal = true;
	}

	async function handleDelete(playlistId: string) {
		if (!confirm(`Delete playlist "${playlistId}"?`)) return;
		try {
			await fetchApi(`manage-playlists/delete/${playlistId}`, { method: "DELETE" });
			loadData();
			triggerRefresh();
		} catch (e: any) {
			alert("Delete failed: " + e.message);
		}
	}

	async function handleSave() {
		if (!currentItem.playlistId) return alert("Playlist ID is required");
		saving = true;
		try {
			await fetchApi(`manage-playlists/upsert/${currentItem.playlistId}`, {
				method: "POST",
				body: JSON.stringify(currentItem)
			});
			showModal = false;
			loadData();
			triggerRefresh();
		} catch (e: any) {
			alert("Save failed: " + e.message);
		} finally {
			saving = false;
		}
	}
	
	function addMap(mapName: string) {
		if (currentItem.maps.includes(mapName)) return;
		currentItem.maps = [...currentItem.maps, mapName];
		songSearchQuery = "";
	}

	function removeMap(index: number) {
		currentItem.maps = currentItem.maps.filter((_: any, i: number) => i !== index);
	}

	function moveMap(index: number, direction: 'up' | 'down') {
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= currentItem.maps.length) return;
		const arr = [...currentItem.maps];
		const temp = arr[index];
		arr[index] = arr[newIndex];
		arr[newIndex] = temp;
		currentItem.maps = arr;
	}

	const filteredSongs = $derived(
		songSearchQuery.length < 2 ? [] :
		allSongs.filter(s => 
			s.title?.toLowerCase().includes(songSearchQuery.toLowerCase()) ||
			s.mapName?.toLowerCase().includes(songSearchQuery.toLowerCase())
		).slice(0, 10)
	);

	const filteredItems = $derived(
		items.filter(item => 
			item.playlistId.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(locPreviews[item.titleId] || "").toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	// Reserved IDs check
	const isReserved = (id: string) => id.startsWith('reco-');
</script>

<div class="p-6 space-y-6 max-w-[1600px] mx-auto">
	<!-- Header -->
	<PageHeader
		title="Playlist Management"
		description="Manage curated and recommended playlists for the game."
		icon={PlayCircle}
	>
		{#snippet children()}
			<div
				class="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-2 w-72 focus-within:border-indigo-500/50 transition-all backdrop-blur-md"
			>
				<Search class="w-4 h-4 text-slate-500" />
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search playlists..."
					class="bg-transparent text-sm text-white outline-none w-full placeholder-slate-600"
				/>
			</div>
		{/snippet}

		{#snippet actions()}
			<button
				onclick={openCreate}
				class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
			>
				<Plus class="w-4 h-4" /> Create Playlist
			</button>
		{/snippet}
	</PageHeader>

	{#if loading}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{#each Array(8) as _}
				<div class="h-64 bg-slate-900 animate-pulse rounded-2xl border border-slate-800"></div>
			{/each}
		</div>
	{:else if error}
		<div class="bg-red-500/10 border border-red-500/20 rounded-2xl p-12 text-center">
			<h3 class="text-xl font-bold text-white mb-2">Failed to load playlists</h3>
			<p class="text-slate-400 mb-6">{error}</p>
			<button onclick={loadData} class="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-xl font-medium transition-colors">Try Again</button>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{#each filteredItems as item (item.playlistId)}
				<div class="group bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col backdrop-blur-sm relative">
					
					<!-- Card Header (Visual) -->
					<div class="h-32 bg-slate-800 relative overflow-hidden">
						{#if item.covers?.en}
							<img src={resolveUrl(item.covers.en)} alt="" class="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
						{:else}
							<div class="w-full h-full flex items-center justify-center text-slate-700">
								<ImageIcon class="w-12 h-12" />
							</div>
						{/if}
						
						<!-- Type Badge -->
						<div class="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg flex items-center gap-2 border border-white/10">
							<span class="text-[10px] font-bold uppercase tracking-wider text-white">{item.type}</span>
						</div>

						{#if item.pinned}
							<div class="absolute top-3 right-3 p-1.5 bg-amber-600 rounded-lg shadow-lg border border-amber-400/30">
								<Pin class="w-3 h-3 text-white" />
							</div>
						{/if}

						{#if isReserved(item.playlistId)}
							<div class="absolute bottom-3 left-3 px-2 py-0.5 bg-indigo-600/90 rounded text-[9px] font-bold text-white uppercase tracking-widest border border-indigo-400/30 shadow-lg">
								Automated System
							</div>
						{/if}
					</div>

					<!-- Card Content -->
					<div class="p-4 flex-1 flex flex-col gap-3">
						<div>
							<h3 class="text-white font-bold truncate text-lg">{locPreviews[item.titleId] || `ID: ${item.titleId}`}</h3>
							<p class="text-[10px] text-slate-500 font-mono mt-0.5">{item.playlistId}</p>
							<p class="text-xs text-slate-400 line-clamp-2 mt-2">{locPreviews[item.descriptionId] || "No description provided."}</p>
						</div>

						<div class="flex items-center gap-4 mt-auto">
							<div class="flex items-center gap-1.5">
								<Music class="w-3.5 h-3.5 text-indigo-400" />
								<span class="text-xs text-slate-300 font-bold">{item.maps?.length || 0} maps</span>
							</div>
							{#if item.colors}
								<div class="flex items-center gap-1">
									<div class="w-3 h-3 rounded-full border border-white/10" style="background-color: #{item.colors.base_color?.substring(0,6) || 'transparent'}"></div>
									<div class="w-3 h-3 rounded-full border border-white/10" style="background-color: #{item.colors.grad_color?.substring(0,6) || 'transparent'}"></div>
								</div>
							{/if}
						</div>
					</div>

					<!-- Actions Overlay -->
					<div class="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between">
						<div class="flex items-center gap-2">
							{#if item.fixedMapOrder}<CheckCircle2 class="w-3 h-3 text-emerald-500" title="Fixed Order" />{:else}<XCircle class="w-3 h-3 text-slate-600" title="Random Order" />{/if}
							<span class="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Order: {item.fixedMapOrder ? 'Fixed' : 'Shuffled'}</span>
						</div>
						<div class="flex items-center gap-1">
							<button onclick={() => openEdit(item)} class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"><Edit2 class="w-4 h-4" /></button>
							<button onclick={() => handleDelete(item.playlistId)} class="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" disabled={isReserved(item.playlistId)}><Trash2 class="w-4 h-4" /></button>
						</div>
					</div>
				</div>
			{:else}
				<div class="col-span-full py-24 text-center">
					<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-900 text-slate-700 mb-4 border border-slate-800">
						<PlayCircle class="w-10 h-10" />
					</div>
					<h3 class="text-xl font-bold text-white mb-2">No playlists found</h3>
					<p class="text-slate-500 max-w-md mx-auto">Create a new playlist or adjust your search.</p>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal -->
{#if showModal && currentItem}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-black/60 backdrop-blur-md" onclick={() => showModal = false}></div>
		
		<div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative z-10 overflow-hidden">
			<!-- Modal Header -->
			<div class="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm">
				<div class="flex items-center gap-3">
					<div class="p-2 bg-indigo-600/20 rounded-xl">
						<svelte:component this={modalMode === 'edit' ? Edit2 : Plus} class="w-5 h-5 text-indigo-500" />
					</div>
					<div>
						<h2 class="text-xl font-bold text-white">{modalMode === 'edit' ? 'Edit' : 'Create'} Playlist</h2>
						<p class="text-xs text-slate-400">{isReserved(currentItem.playlistId) ? 'Editing system-reserved metadata.' : 'Configure custom playlist properties.'}</p>
					</div>
				</div>
				<button onclick={() => showModal = false} class="text-slate-400 hover:text-white transition-colors text-2xl font-light">
					&times;
				</button>
			</div>

			<!-- Modal Body -->
			<div class="p-6 overflow-y-auto flex-1 space-y-4">
				<!-- Basic Config -->
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Playlist ID</label>
						<input
							type="text"
							bind:value={currentItem.playlistId}
							readonly={modalMode === 'edit'}
							placeholder="SummerHits2026"
							class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-all read-only:opacity-50"
						/>
					</div>
					<div class="space-y-1.5">
						<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Type</label>
						<select
							bind:value={currentItem.type}
							class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
						>
							<option value="curated">Curated (Manual)</option>
							<option value="recommended">Recommended (Automated)</option>
						</select>
					</div>
				</div>

				<!-- Localization -->
				<div class="space-y-4 border-t border-slate-800 pt-4">
					<h3 class="text-sm font-bold text-white flex items-center gap-2">
						<Languages class="w-4 h-4 text-indigo-400" />
						Localization
					</h3>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-1.5">
							<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Title Loc ID</label>
							<div class="flex gap-2">
								<input type="number" bind:value={currentItem.titleId} class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
								<a href="/locs" target="_blank" class="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors">
									<ExternalLink class="w-4 h-4" />
								</a>
							</div>
							{#if locPreviews[currentItem.titleId]}<p class="text-[10px] text-indigo-400 italic">"{locPreviews[currentItem.titleId]}"</p>{/if}
						</div>
						<div class="space-y-1.5">
							<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Description Loc ID</label>
							<input type="number" bind:value={currentItem.descriptionId} class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
							{#if locPreviews[currentItem.descriptionId]}<p class="text-[10px] text-indigo-400 italic">"{locPreviews[currentItem.descriptionId]}"</p>{/if}
						</div>
					</div>
				</div>

				<!-- Maps & Settings -->
				<div class="grid grid-cols-2 gap-6 border-t border-slate-800 pt-4">
					<div class="space-y-4">
						<h3 class="text-sm font-bold text-white flex items-center gap-2">
							<MapIcon class="w-4 h-4 text-emerald-400" />
							Settings
						</h3>
						<div class="flex flex-col gap-3">
							<label class="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-xl cursor-pointer hover:border-indigo-500 transition-all">
								<span class="text-sm text-slate-300">Fixed Map Order</span>
								<input type="checkbox" bind:checked={currentItem.fixedMapOrder} class="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500" />
							</label>
							<label class="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-xl cursor-pointer hover:border-indigo-500 transition-all">
								<span class="text-sm text-slate-300">Pinned to Top</span>
								<input type="checkbox" bind:checked={currentItem.pinned} class="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500" />
							</label>
						</div>
					</div>

					<div class="space-y-4">
						<h3 class="text-sm font-bold text-white flex items-center gap-2">
							<Palette class="w-4 h-4 text-pink-400" />
							Colors (ARGB Hex)
						</h3>
						<div class="space-y-3">
							<div class="space-y-1.5">
								<label class="text-[10px] font-bold uppercase text-slate-500">Base Color</label>
								<div class="flex gap-2">
									<input type="text" bind:value={currentItem.colors.base_color} class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white outline-none font-mono" />
									<div class="w-10 h-10 rounded-xl border border-slate-700" style="background-color: #{currentItem.colors.base_color?.substring(0,6) || '000'}"></div>
								</div>
							</div>
							<div class="space-y-1.5">
								<label class="text-[10px] font-bold uppercase text-slate-500">Gradient Color</label>
								<div class="flex gap-2">
									<input type="text" bind:value={currentItem.colors.grad_color} class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white outline-none font-mono" />
									<div class="w-10 h-10 rounded-xl border border-slate-700" style="background-color: #{currentItem.colors.grad_color?.substring(0,6) || '000'}"></div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Covers -->
				<div class="space-y-4 border-t border-slate-800 pt-4">
					<h3 class="text-sm font-bold text-white flex items-center gap-2">
						<ImageIcon class="w-4 h-4 text-sky-400" />
						Covers
					</h3>
					<div class="space-y-3">
						<div class="space-y-1.5">
							<label class="text-[10px] font-bold uppercase text-slate-500">Default (EN) Cover URL</label>
							<input type="text" bind:value={currentItem.covers.en} class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
						</div>
						{#if currentItem.covers.en}
							<img src={resolveUrl(currentItem.covers.en)} alt="Preview" class="h-32 rounded-xl border border-slate-800 object-cover shadow-lg" />
						{/if}
					</div>
				</div>

				<!-- Maps List -->
				<div class="space-y-4 border-t border-slate-800 pt-4">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-bold text-white flex items-center gap-2">
							<Music class="w-4 h-4 text-purple-400" />
							Maps ({currentItem.maps?.length || 0} selected)
						</h3>
						<div class="relative w-64">
							<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
							<input 
								type="text" 
								bind:value={songSearchQuery}
								placeholder="Search songs to add..."
								class="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:border-indigo-500 outline-none transition-all"
							/>
							
							{#if filteredSongs.length > 0}
								<div class="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-20 overflow-hidden">
									{#each filteredSongs as song}
										<button 
											onclick={() => addMap(song.mapName)}
											class="w-full px-4 py-2 text-left hover:bg-indigo-600/20 flex items-center justify-between group transition-colors border-b border-slate-800 last:border-0"
										>
											<div>
												<p class="text-xs font-bold text-white group-hover:text-indigo-400">{song.title}</p>
												<p class="text-[10px] text-slate-500">{song.mapName}</p>
											</div>
											<Plus class="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
										</button>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<div class="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
						{#each currentItem.maps as mapName, i}
							{@const song = songMap[mapName]}
							<div class="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-2 group hover:border-slate-600 transition-all">
								<div class="w-10 h-10 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0">
									{#if song}
										<img src={getSongThumbnail(song)} alt="" class="w-full h-full object-cover" />
									{:else}
										<div class="w-full h-full flex items-center justify-center text-slate-700">
											<Music class="w-5 h-5" />
										</div>
									{/if}
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-xs font-bold text-white truncate">{song?.title || mapName}</p>
									<p class="text-[10px] text-slate-500 font-mono truncate">{mapName}</p>
								</div>
								<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<button onclick={() => moveMap(i, 'up')} disabled={i === 0} class="p-1.5 text-slate-500 hover:text-white disabled:opacity-0"><ArrowUp class="w-3.5 h-3.5" /></button>
									<button onclick={() => moveMap(i, 'down')} disabled={i === currentItem.maps.length - 1} class="p-1.5 text-slate-500 hover:text-white disabled:opacity-0"><ArrowDown class="w-3.5 h-3.5" /></button>
									<button onclick={() => removeMap(i)} class="p-1.5 text-slate-500 hover:text-red-400"><Trash2 class="w-3.5 h-3.5" /></button>
								</div>
							</div>
						{:else}
							<div class="py-8 text-center border-2 border-dashed border-slate-800 rounded-2xl">
								<p class="text-xs text-slate-600 uppercase font-black tracking-widest">No songs in playlist</p>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="p-6 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/50 backdrop-blur-sm">
				<button onclick={() => showModal = false} class="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">Cancel</button>
				<button
					onclick={handleSave}
					disabled={saving || !currentItem.playlistId}
					class="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
				>
					{#if saving}
						<RefreshCw class="w-4 h-4 animate-spin" /> Saving...
					{:else}
						{modalMode === 'edit' ? 'Update Playlist' : 'Create Playlist'}
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body) { background-color: #020617; }
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
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
</style>
