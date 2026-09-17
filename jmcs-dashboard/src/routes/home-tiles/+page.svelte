<script lang="ts">
	import { onMount } from "svelte";
	import { fetchApi } from "$lib/api";
	import {
		Layout,
		Clock,
		Zap,
		Plus,
		Edit2,
		Trash2,
		Filter,
		Lock,
		Unlock,
		Calendar,
		ExternalLink,
		ChevronRight,
		Info,
		Video,
		Music,
		Newspaper,
		MessageSquare,
		PlayCircle,
		Search,
		RefreshCw,
		Image as ImageIcon,
		User
	} from "lucide-svelte";
	import JsonEditor from "$lib/components/JsonEditor.svelte";
	import { triggerRefresh } from "$lib/jmcs";
	import PageHeader from "$lib/components/PageHeader.svelte";
	import { resolveUrl } from "$lib/utils";

	// --- State ---
	let activeTab = $state<"scheduled" | "corrections">("scheduled");
	let scheduledTiles = $state<any[]>([]);
	let corrections = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let showModal = $state(false);
	let modalMode = $state<"create" | "edit">("create");
	let editingTile = $state<any>(null);
	let saving = $state(false);

	let searchQuery = $state("");

	// --- Types ---
	const TILE_TYPES = ["map", "playlist", "news", "video", "uplay", "feedback"];
	const SUB_TYPES: Record<string, string[]> = {
		news: ["news", "gameEvents", "Tips", "maintenance"],
		map: ["recommended", "jduExclusive", "newRelease"],
		playlist: ["recommended", "curated", "thematic"],
	};

	// --- Helpers ---
	function formatTime(ms: number) {
		if (!ms) return "N/A";
		return new Date(ms).toLocaleString();
	}

	function toIso(ms: number) {
		if (!ms) return "";
		const date = new Date(ms);
		return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
			.toISOString()
			.slice(0, 16);
	}

	function fromIso(iso: string) {
		if (!iso) return 0;
		return new Date(iso).getTime();
	}

	const getIcon = (type: string) => {
		switch (type) {
			case "map": return Music;
			case "playlist": return PlayCircle;
			case "news": return Newspaper;
			case "video": return Video;
			case "feedback": return MessageSquare;
			default: return Layout;
		}
	};

	// --- Data Fetching ---
	async function loadData() {
		loading = true;
		error = null;
		try {
			const [s, c] = await Promise.all([
				fetchApi<any[]>("/home/v1/manual-content"),
				fetchApi<any[]>("/home/v1/manual-content-correction")
			]);
			scheduledTiles = s || [];
			corrections = c || [];
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	onMount(loadData);

	// --- Actions ---
	function openCreate() {
		modalMode = "create";
		editingTile = {
			uuid: crypto.randomUUID(),
			type: "news",
			activationTime: Date.now(),
			contentExpiry: Date.now() + 86400000 * 7,
			locked: false,
			lockPosition: 0,
			lockDuration: 0,
			filters: [],
			title: "",
			text: "",
			imageUrl: "",
			subtype: "news"
		};
		showModal = true;
	}

	function openEdit(tile: any) {
		modalMode = "edit";
		editingTile = JSON.parse(JSON.stringify(tile));
		showModal = true;
	}

	async function handleDelete(uuid: string) {
		if (!confirm("Are you sure you want to delete this tile?")) return;
		try {
			const endpoint = activeTab === "scheduled" ? "manual-content" : "manual-content-correction";
			await fetchApi(`/home/v1/${endpoint}/${uuid}`, { method: "DELETE" });
			loadData();
			triggerRefresh();
		} catch (e: any) {
			alert("Delete failed: " + e.message);
		}
	}

	async function handleSave() {
		saving = true;
		try {
			const isCorrection = activeTab === "corrections";
			const endpoint = isCorrection ? "manual-content-correction" : "manual-content";
			const isUpdate = modalMode === "edit";
			
			let url = `/home/v1/${endpoint}`;
			let method = "POST";

			if (isCorrection) {
				// Corrections use PUT /:uuid for upsert
				url += `/${editingTile.uuid}`;
				method = "PUT";
			} else if (isUpdate) {
				// Scheduled content uses PUT /:uuid for update
				url += `/${editingTile.uuid}`;
				method = "PUT";
			}

			await fetchApi(url, {
				method,
				body: JSON.stringify(editingTile)
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

	const filteredItems = $derived(
		(activeTab === "scheduled" ? scheduledTiles : corrections).filter(t => 
			JSON.stringify(t).toLowerCase().includes(searchQuery.toLowerCase())
		)
	);
</script>

<div class="p-6 space-y-6 max-w-[1600px] mx-auto">
	<!-- Header -->
	<PageHeader
		title="Home Tiles Management"
		description="Manage scheduled content and real-time corrections for the home screen."
		icon={Layout}
	>
		{#snippet children()}
			<div
				class="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-2 w-72 focus-within:border-indigo-500/50 transition-all backdrop-blur-md"
			>
				<Search class="w-4 h-4 text-slate-500" />
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search tiles..."
					class="bg-transparent text-sm text-white outline-none w-full placeholder-slate-600"
				/>
			</div>
		{/snippet}

		{#snippet actions()}
			<button
				onclick={openCreate}
				class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
			>
				<Plus class="w-4 h-4" /> Create Tile
			</button>
		{/snippet}
	</PageHeader>

	<!-- Tabs -->
	<div class="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
		<button
			onclick={() => activeTab = "scheduled"}
			class="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all {activeTab === 'scheduled' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}"
		>
			<Clock class="w-4 h-4" /> Scheduled Content
		</button>
		<button
			onclick={() => activeTab = "corrections"}
			class="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all {activeTab === 'corrections' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}"
		>
			<Zap class="w-4 h-4" /> Live Corrections
		</button>
	</div>

	{#if loading}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{#each Array(8) as _}
				<div class="h-48 bg-slate-900 animate-pulse rounded-2xl border border-slate-800"></div>
			{/each}
		</div>
	{:else if error}
		<div class="bg-red-500/10 border border-red-500/20 rounded-2xl p-12 text-center">
			<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 text-red-500 mb-4">
				<Trash2 class="w-8 h-8" />
			</div>
			<h3 class="text-xl font-bold text-white mb-2">Failed to load content</h3>
			<p class="text-slate-400 mb-6 max-w-md mx-auto">{error}</p>
			<button
				onclick={loadData}
				class="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-xl font-medium transition-colors"
			>
				Try Again
			</button>
		</div>
	{:else}
		<!-- Content Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{#each filteredItems as tile (tile.uuid)}
				<div class="group bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col backdrop-blur-sm relative">
					
					<!-- Card Header (Visual) -->
					<div class="h-32 bg-slate-800 relative overflow-hidden">
						{#if tile.imageUrl}
							<img src={resolveUrl(tile.imageUrl)} alt="" class="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
						{:else}
							<div class="w-full h-full flex items-center justify-center text-slate-700">
								<ImageIcon class="w-12 h-12" />
							</div>
						{/if}
						
						<!-- Badge -->
						<div class="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg flex items-center gap-2 border border-white/10">
							<svelte:component this={getIcon(tile.type)} class="w-3.5 h-3.5 text-indigo-400" />
							<span class="text-[10px] font-bold uppercase tracking-wider text-white">{tile.type}</span>
						</div>

						{#if tile.locked}
							<div class="absolute top-3 right-3 p-1.5 bg-indigo-600 rounded-lg shadow-lg border border-indigo-400/30">
								<Lock class="w-3.5 h-3.5 text-white" />
							</div>
						{/if}
					</div>

					<!-- Card Content -->
					<div class="p-4 flex-1 flex flex-col gap-3">
						<div>
							<h3 class="text-white font-bold truncate">{tile.title || tile.mapName || tile.playlistID || "Unnamed Tile"}</h3>
							<p class="text-xs text-slate-500 line-clamp-2 mt-1">{tile.text || tile.description || "No description provided."}</p>
						</div>

						<div class="space-y-2 text-xs">
							<div class="flex items-center justify-between text-slate-400">
								<span class="flex items-center gap-1.5"><Calendar class="w-3 h-3" /> Start:</span>
								<span class="text-slate-200">{formatTime(tile.activationTime)}</span>
							</div>
							<div class="flex items-center justify-between text-slate-400">
								<span class="flex items-center gap-1.5"><Clock class="w-3 h-3" /> End:</span>
								<span class="text-slate-200">{formatTime(tile.contentExpiry)}</span>
							</div>
							{#if tile.locked}
								<div class="flex items-center justify-between text-slate-400">
									<span class="flex items-center gap-1.5"><Layout class="w-3 h-3" /> Position:</span>
									<span class="text-indigo-400 font-bold">Slot {tile.lockPosition}</span>
								</div>
							{/if}
						</div>

						<!-- Filters Preview -->
						{#if tile.filters && tile.filters.length > 0}
							<div class="flex flex-wrap gap-1 pt-2">
								{#each tile.filters as filter}
									<span class="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-400">
										{filter.gameVersion?.join(', ') || 'Global'}
									</span>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Actions Overlay -->
					<div class="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between gap-2">
						<span class="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">{tile.uuid}</span>
						<div class="flex items-center gap-2">
							<button
								onclick={() => openEdit(tile)}
								class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
							>
								<Edit2 class="w-4 h-4" />
							</button>
							<button
								onclick={() => handleDelete(tile.uuid)}
								class="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
							>
								<Trash2 class="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>
			{:else}
				<div class="col-span-full py-24 text-center">
					<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-900 text-slate-700 mb-4 border border-slate-800">
						<Layout class="w-10 h-10" />
					</div>
					<h3 class="text-xl font-bold text-white mb-2">No tiles found</h3>
					<p class="text-slate-500 max-w-md mx-auto">Try adjusting your search query or create a new tile to get started.</p>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal -->
{#if showModal}
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
						<h2 class="text-xl font-bold text-white">{modalMode === 'edit' ? 'Edit' : 'Create'} Home Tile</h2>
						<p class="text-xs text-slate-400">Configure content properties and scheduling.</p>
					</div>
				</div>
				<button onclick={() => showModal = false} class="text-slate-400 hover:text-white transition-colors text-2xl font-light">
					&times;
				</button>
			</div>

			<!-- Modal Body -->
			<div class="p-6 overflow-y-auto flex-1 space-y-6">
				<!-- Basic Config -->
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tile Type</label>
						<select
							bind:value={editingTile.type}
							class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-all"
						>
							{#each TILE_TYPES as type}
								<option value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">UUID</label>
						<input
							type="text"
							bind:value={editingTile.uuid}
							readonly={modalMode === 'edit'}
							class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-all read-only:opacity-50"
						/>
					</div>
				</div>

				<!-- Times -->
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Activation Time</label>
						<input
							type="datetime-local"
							value={toIso(editingTile.activationTime)}
							oninput={e => editingTile.activationTime = fromIso(e.currentTarget.value)}
							class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-all"
						/>
					</div>
					<div class="space-y-1.5">
						<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Expiry Time</label>
						<input
							type="datetime-local"
							value={toIso(editingTile.contentExpiry)}
							oninput={e => editingTile.contentExpiry = fromIso(e.currentTarget.value)}
							class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-all"
						/>
					</div>
				</div>

				<!-- Locking -->
				<div class="bg-slate-800/50 rounded-2xl p-4 border border-slate-800 space-y-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<svelte:component this={editingTile.locked ? Lock : Unlock} class="w-4 h-4 {editingTile.locked ? 'text-indigo-400' : 'text-slate-500'}" />
							<span class="text-sm font-medium text-white">Locked Position</span>
						</div>
						<button
							onclick={() => editingTile.locked = !editingTile.locked}
							class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none {editingTile.locked ? 'bg-indigo-600' : 'bg-slate-700'}"
						>
							<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editingTile.locked ? 'translate-x-6' : 'translate-x-1'}"></span>
						</button>
					</div>

					{#if editingTile.locked}
						<div class="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
							<div class="space-y-1.5">
								<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Grid Position (0-11)</label>
								<input
									type="number"
									min="0"
									max="11"
									bind:value={editingTile.lockPosition}
									class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
								/>
							</div>
							<div class="space-y-1.5">
								<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lock Duration (seconds)</label>
								<input
									type="number"
									bind:value={editingTile.lockDuration}
									class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
								/>
							</div>
						</div>
					{/if}
				</div>

				<!-- Dynamic Content Payload -->
				<div class="space-y-4 border-t border-slate-800 pt-6">
					<h3 class="text-sm font-bold text-white flex items-center gap-2">
						<Info class="w-4 h-4 text-indigo-400" />
						Tile Content Properties
					</h3>

					{#if editingTile.type === 'news'}
						<div class="space-y-4">
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-1.5">
									<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Subtype</label>
									<select bind:value={editingTile.subtype} class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
										{#each SUB_TYPES.news as s}<option value={s}>{s}</option>{/each}
									</select>
								</div>
								<div class="space-y-1.5">
									<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Image URL</label>
									<input type="text" bind:value={editingTile.imageUrl} class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
								</div>
							</div>
							<div class="space-y-1.5">
								<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Title</label>
								<input type="text" bind:value={editingTile.title} class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
							</div>
							<div class="space-y-1.5">
								<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Body Text</label>
								<textarea bind:value={editingTile.text} rows="3" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none"></textarea>
							</div>
							<div class="space-y-1.5">
								<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Winner PID (Optional Dancer Card)</label>
								<input type="text" bind:value={editingTile.winnerPid} placeholder="GUID..." class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
							</div>
						</div>
					{:else if editingTile.type === 'map'}
						<div class="space-y-4">
							<div class="space-y-1.5">
								<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Map Name (Codename)</label>
								<input type="text" bind:value={editingTile.mapName} placeholder="e.g. ButtonsALT" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
							</div>
							<div class="space-y-1.5">
								<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Subtype</label>
								<select bind:value={editingTile.subtype} class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
									{#each SUB_TYPES.map as s}<option value={s}>{s}</option>{/each}
								</select>
							</div>
						</div>
					{:else if editingTile.type === 'playlist'}
						<div class="space-y-4">
							<div class="space-y-1.5">
								<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Playlist ID</label>
								<input type="text" bind:value={editingTile.playlistID} class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
							</div>
							<div class="space-y-1.5">
								<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Subtype</label>
								<select bind:value={editingTile.subtype} class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
									{#each SUB_TYPES.playlist as s}<option value={s}>{s}</option>{/each}
								</select>
							</div>
						</div>
					{:else if editingTile.type === 'video'}
						<div class="space-y-4">
							<div class="space-y-1.5">
								<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Video Data URL</label>
								<input type="text" bind:value={editingTile.videoDataUrl} class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
							</div>
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-1.5">
									<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Thumbnail URL</label>
									<input type="text" bind:value={editingTile.thumbnailUrl} class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
								</div>
								<div class="space-y-1.5">
									<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dancer PID</label>
									<input type="text" bind:value={editingTile.dancerPid} class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
								</div>
							</div>
							<div class="space-y-1.5">
								<label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Description</label>
								<textarea bind:value={editingTile.description} rows="2" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none"></textarea>
							</div>
						</div>
					{/if}
				</div>

				<!-- Filters -->
				<div class="space-y-3 border-t border-slate-800 pt-6">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-bold text-white flex items-center gap-2">
							<Filter class="w-4 h-4 text-amber-500" />
							Carousel Filters
						</h3>
					</div>
					<JsonEditor
						value={JSON.stringify(editingTile.filters || [], null, 2)}
						onchange={val => {
							try { editingTile.filters = JSON.parse(val); } catch(e) {}
						}}
					/>
					<p class="text-[10px] text-slate-500">Filters use the JD_CarouselSkuFilter format to target specific versions.</p>
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="p-6 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/50 backdrop-blur-sm">
				<button
					onclick={() => showModal = false}
					class="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={handleSave}
					disabled={saving}
					class="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
				>
					{#if saving}
						<RefreshCw class="w-4 h-4 animate-spin" />
						Saving...
					{:else}
						Save Changes
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		background-color: #020617;
	}
</style>
