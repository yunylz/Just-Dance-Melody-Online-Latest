<script lang="ts">
	import { fetchApi } from "$lib/api";
	import { onMount } from "svelte";
	import { Plus, Trash2, Search, Edit2, Send, Filter, Zap, SortAsc } from "lucide-svelte";
	import { getSongThumbnail } from "$lib/utils";

	let lists: any[] = $state([]);
	let songs: any[] = $state([]);
	let actionListNames: string[] = $state([]);
	let loading = $state(true);
	let selectedList: any = $state(null);
	let isDirty = $state(false);
	let saving = $state(false);
	let publishing = $state(false);
	let searchQuery = $state("");
	let songSearch = $state("");
	let showNewModal = $state(false);
	let newListName = $state("");
	let selectedTags: string[] = $state([]);
	let selectedVersions: number[] = $state([]);
	let bulkAct = $state("");
	let bulkIsc = $state("");

	onMount(async () => {
		await Promise.all([load(), loadSongs(), loadActionLists()]);
	});

	async function load() {
		loading = true;
		const res = await fetchApi<{ items: any[] }>(
			"manage-carousel/listItemLists",
		);
		lists = res.items || [];
		loading = false;
	}
	async function loadSongs() {
		const res = await fetchApi<{ items: any[] }>("manage-songs/list");
		songs = res.items || [];
	}
	async function loadActionLists() {
		const res = await fetchApi<{ items: any[] }>(
			"manage-carousel/listActionLists",
		);
		actionListNames = (res.items || []).map((i: any) => i.name);
	}

	function selectList(list: any) {
		if (isDirty && !confirm("Discard unsaved changes?")) return;
		selectedList = JSON.parse(JSON.stringify(list));
		isDirty = false;
		songSearch = "";
	}

	function markDirty() {
		isDirty = true;
	}

	function sortByTitle() {
		if (!selectedList || !selectedList.items) return;
		selectedList.items.sort((a: any, b: any) => {
			const songA = songs.find((s) => s.mapName === a.mapName);
			const songB = songs.find((s) => s.mapName === b.mapName);
			const titleA = songA?.title || a.mapName;
			const titleB = songB?.title || b.mapName;
			return titleA.localeCompare(titleB);
		});
		markDirty();
	}

	function bulkApplyActIsc() {
		if (!selectedList || !selectedList.items) return;
		if (
			!confirm(
				`Apply ACT="${bulkAct}" and ISC="${bulkIsc}" to all ${selectedList.items.length} items?`,
			)
		)
			return;

		selectedList.items.forEach((item: any) => {
			if (bulkAct) item.act = bulkAct;
			if (bulkIsc) item.isc = bulkIsc;
			item.__class = "SongItem";
		});
		markDirty();
	}

	let filteredLists = $derived(
		searchQuery
			? lists.filter((l) =>
					l.name.toLowerCase().includes(searchQuery.toLowerCase()),
				)
			: lists,
	);

	let filteredSongs = $derived(
		songSearch
			? songs
					.filter((s) =>
						(s.mapName + " " + s.title + " " + s.artist)
							.toLowerCase()
							.includes(songSearch.toLowerCase()),
					)
					.slice(0, 20)
			: songs.slice(0, 20),
	);

	let allTags = $derived.by(() => {
		const tags = new Set<string>();
		songs.forEach((s) => {
			if (Array.isArray(s.tags)) {
				s.tags.forEach((t: string) => tags.add(t));
			}
		});
		return Array.from(tags).sort();
	});

	let allVersions = $derived.by(() => {
		const versions = new Set<number>();
		songs.forEach((s) => {
			if (s.originalJDVersion) versions.add(s.originalJDVersion);
		});
		return Array.from(versions).sort((a, b) => b - a);
	});

	function addSongToList(song: any) {
		if (!selectedList) return;
		if (!selectedList.items) selectedList.items = [];
		if (selectedList.items.some((i: any) => i.mapName === song.mapName))
			return;
		selectedList.items.push({ mapName: song.mapName });
		markDirty();
	}

	function populateFromFilters() {
		if (!selectedList) return;
		const matchingSongs = songs.filter((s) => {
			const tagMatch =
				selectedTags.length === 0 ||
				(Array.isArray(s.tags) &&
					selectedTags.some((t) => s.tags.includes(t)));
			const versionMatch =
				selectedVersions.length === 0 ||
				selectedVersions.includes(s.originalJDVersion);
			return tagMatch && versionMatch;
		});

		if (matchingSongs.length === 0) {
			alert("No songs match the selected filters.");
			return;
		}

		if (
			!confirm(
				`Add ${matchingSongs.length} matching songs to the list?`,
			)
		)
			return;

		if (!selectedList.items) selectedList.items = [];
		matchingSongs.forEach((song) => {
			if (
				!selectedList.items.some((i: any) => i.mapName === song.mapName)
			) {
				selectedList.items.push({ mapName: song.mapName });
			}
		});
		markDirty();
	}

	function removeSong(idx: number) {
		if (!selectedList) return;
		selectedList.items.splice(idx, 1);
		markDirty();
	}

	async function save() {
		if (!selectedList) return;
		saving = true;
		try {
			await fetchApi(
				`manage-carousel/updateItemList/${selectedList.name}`,
				{
					method: "PUT",
					body: JSON.stringify(selectedList),
				},
			);
			isDirty = false;
			await load();
		} catch (e: any) {
			alert("Save failed: " + e.message);
		} finally {
			saving = false;
		}
	}

	async function createList() {
		const name = newListName.trim();
		if (!name) return;
		await fetchApi("manage-carousel/updateItemList/" + name, {
			method: "PUT",
			body: JSON.stringify({ name, items: [] }),
		});
		showNewModal = false;
		newListName = "";
		await load();
	}

	async function deleteList(name: string) {
		if (!confirm(`Delete item list "${name}"?`)) return;
		await fetchApi(`manage-carousel/deleteItemList/${name}`, {
			method: "DELETE",
		});
		if (selectedList?.name === name) selectedList = null;
		await load();
	}

	async function publish() {
		publishing = true;
		try {
			await fetchApi("manage-carousel/publish", { method: "POST" });
			alert("Published to Redis!");
		} catch (e: any) {
			alert("Publish failed: " + e.message);
		} finally {
			publishing = false;
		}
	}
</script>

<div class="flex h-[calc(100vh-4rem)] -m-6">
	<!-- Left: list selector -->
	<aside
		class="w-64 border-r border-slate-800 flex flex-col bg-slate-900/50 flex-shrink-0"
	>
		<div
			class="p-4 border-b border-slate-800 flex items-center justify-between"
		>
			<h2 class="font-semibold text-white text-sm">Item Lists</h2>
			<button
				onclick={() => (showNewModal = true)}
				class="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
				><Plus class="w-4 h-4" /></button
			>
		</div>
		<div class="p-3 border-b border-slate-800">
			<div
				class="flex items-center gap-2 bg-slate-800 rounded-md px-2.5 py-1.5 border border-slate-700"
			>
				<Search class="w-3.5 h-3.5 text-slate-500" />
				<input
					bind:value={searchQuery}
					type="text"
					placeholder="Filter..."
					class="bg-transparent text-xs text-white outline-none flex-1 placeholder-slate-500"
				/>
			</div>
		</div>
		<div class="flex-1 overflow-y-auto">
			{#if loading}
				<div class="p-3 space-y-2">
					{#each Array(5) as _}<div
							class="h-8 bg-slate-800 animate-pulse rounded"
						></div>{/each}
				</div>
			{:else}
				{#each filteredLists as list (list.name)}
					<div class="flex items-center group">
						<button
							onclick={() => selectList(list)}
							class="flex-1 text-left px-4 py-2.5 text-sm transition-colors {selectedList?.name ===
							list.name
								? 'bg-indigo-600/20 text-indigo-400 border-r-2 border-indigo-500'
								: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
						>
							<div class="font-medium">{list.name}</div>
							<div class="text-xs text-slate-500 mt-0.5">
								{list.items?.length || 0} maps
							</div>
						</button>
						<button
							onclick={() => deleteList(list.name)}
							class="mr-2 p-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
						>
							<Trash2 class="w-3.5 h-3.5" />
						</button>
					</div>
				{/each}
			{/if}
		</div>
		<div class="p-3 border-t border-slate-800">
			<button
				onclick={publish}
				disabled={publishing}
				class="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
			>
				<Send class="w-4 h-4" />
				{publishing ? "Publishing..." : "Publish to Live"}
			</button>
		</div>
	</aside>

	<!-- Right: editor -->
	<main class="flex-1 overflow-hidden flex flex-col">
		{#if !selectedList}
			<div
				class="flex-1 flex flex-col items-center justify-center text-slate-500"
			>
				<p class="font-medium text-white mb-1">Select an Item List</p>
				<p class="text-sm">
					Click a list on the left to edit its songs.
				</p>
			</div>
		{:else}
			<div
				class="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60"
			>
				<div>
					<h2 class="font-bold text-white">{selectedList.name}</h2>
					<div class="flex items-center gap-4 mt-1">
						<div class="flex items-center gap-2">
							<label class="text-xs text-slate-400"
								>Default Action List</label
							>
							<select
								value={selectedList.actionListName || ""}
								onchange={(e) => {
									selectedList.actionListName =
										e.currentTarget.value;
									markDirty();
								}}
								class="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white focus:border-indigo-500 outline-none"
							>
								<option value="">None</option>
								{#each actionListNames as n}<option value={n}
										>{n}</option
									>{/each}
							</select>
						</div>
						<div class="flex items-center gap-2">
							<label class="text-xs text-slate-400"
								>Upsell Action List</label
							>
							<select
								value={selectedList.upsellActionListName || ""}
								onchange={(e) => {
									selectedList.upsellActionListName =
										e.currentTarget.value;
									markDirty();
								}}
								class="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white focus:border-indigo-500 outline-none"
							>
								<option value="">None</option>
								{#each actionListNames as n}<option value={n}
										>{n}</option
									>{/each}
							</select>
						</div>
					</div>
					<div class="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800">
						<div class="flex items-center gap-2">
							<span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bulk Apply:</span>
							<input
								bind:value={bulkAct}
								type="text"
								placeholder="ACT"
								class="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white focus:border-indigo-500 outline-none"
							/>
							<input
								bind:value={bulkIsc}
								type="text"
								placeholder="ISC"
								class="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white focus:border-indigo-500 outline-none"
							/>
							<button 
								onclick={bulkApplyActIsc}
								disabled={!bulkAct && !bulkIsc}
								class="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 px-2 py-0.5 rounded text-[10px] font-bold transition-colors disabled:opacity-30"
							>
								Apply to All
							</button>
						</div>
					</div>
				</div>
				<div class="flex items-center gap-2">
					{#if isDirty}<span
							class="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-1 rounded-full"
							>Unsaved</span
						>{/if}
					<button
						onclick={save}
						disabled={saving || !isDirty}
						class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
					>
						{saving ? "Saving..." : "Save"}
					</button>
				</div>
			</div>

			<div class="flex flex-1 overflow-hidden">
				<!-- Current items -->
				<div class="flex-1 overflow-y-auto p-4">
					<div class="flex items-center justify-between mb-3">
						<h3
							class="text-xs font-semibold text-slate-400 uppercase tracking-wider"
						>
							Maps in List ({selectedList.items?.length || 0})
						</h3>
						<button
							onclick={sortByTitle}
							disabled={!selectedList.items?.length}
							class="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider transition-colors disabled:opacity-30"
						>
							<SortAsc class="w-3 h-3" />
							Sort by Title
						</button>
					</div>
					{#if !selectedList.items?.length}
						<p class="text-slate-500 text-sm">
							No maps yet. Add from the right panel.
						</p>
					{/if}
					<div class="space-y-1.5">
						{#each selectedList.items || [] as item, idx (idx)}
							{@const song = songs.find(
								(s) => s.mapName === item.mapName,
							)}
							<div
								class="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-lg p-2.5"
							>
								{#if getSongThumbnail(song)}
									<img
										src={getSongThumbnail(song)}
										class="w-8 h-8 rounded object-cover"
										alt=""
									/>
								{:else}
									<div
										class="w-8 h-8 bg-slate-700 rounded"
									></div>
								{/if}
								<div class="flex-1 min-w-0">
									<p
										class="text-sm font-medium text-white truncate"
									>
										{song?.title || item.mapName}
									</p>
									<p class="text-xs text-slate-500 truncate">
										{song.artist}
									</p>
									<p
										class="text-xs text-slate-400 font-mono truncate"
									>
										{item.mapName}
									</p>
								</div>
								<div class="flex flex-col gap-1 w-32">
									<div class="flex items-center gap-1">
										<span class="text-[9px] text-slate-500 w-6 uppercase">ACT</span>
										<input
											type="text"
											value={item.act || ""}
											oninput={(e) => {
												item.act = e.currentTarget.value;
												item.__class = "SongItem";
												markDirty();
											}}
											class="flex-1 bg-slate-900/50 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-white focus:border-indigo-500 outline-none"
										/>
									</div>
									<div class="flex items-center gap-1">
										<span class="text-[9px] text-slate-500 w-6 uppercase">ISC</span>
										<input
											type="text"
											value={item.isc || ""}
											oninput={(e) => {
												item.isc = e.currentTarget.value;
												item.__class = "SongItem";
												markDirty();
											}}
											class="flex-1 bg-slate-900/50 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-white focus:border-indigo-500 outline-none"
										/>
									</div>
								</div>
								{#if item.actionListName}
									<span
										class="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full"
										>{item.actionListName}</span
									>
								{/if}
								<button
									onclick={() => removeSong(idx)}
									class="p-1 text-slate-500 hover:text-red-400 transition-colors"
								>
									<Trash2 class="w-3.5 h-3.5" />
								</button>
							</div>
						{/each}
					</div>
				</div>

				<!-- Song picker -->
				<div
					class="w-80 border-l border-slate-800 flex flex-col bg-slate-900/40 flex-shrink-0"
				>
					<!-- Bulk Add section -->
					<div class="p-4 border-b border-slate-800 space-y-4">
						<div class="flex items-center gap-2 text-white">
							<Zap class="w-4 h-4 text-yellow-400" />
							<h3 class="text-sm font-bold uppercase tracking-wider">
								Bulk Add
							</h3>
						</div>

						<div class="space-y-3">
							<div class="space-y-1.5">
								<label class="text-[10px] uppercase text-slate-500 font-bold tracking-widest flex justify-between items-center">
									Tags
									{#if selectedTags.length > 0}
										<button onclick={() => selectedTags = []} class="text-indigo-400 hover:text-indigo-300 normal-case tracking-normal font-normal">Clear</button>
									{/if}
								</label>
								<div class="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1 bg-slate-800/30 rounded-md border border-slate-800">
									{#each allTags as tag}
										<button
											onclick={() => {
												if (selectedTags.includes(tag)) selectedTags = selectedTags.filter(t => t !== tag);
												else selectedTags.push(tag);
											}}
											class="text-[10px] px-2 py-0.5 rounded-full border transition-all {selectedTags.includes(tag) 
												? 'bg-indigo-600 border-indigo-500 text-white' 
												: 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}"
										>
											{tag}
										</button>
									{/each}
								</div>
							</div>

							<div class="space-y-1.5">
								<label class="text-[10px] uppercase text-slate-500 font-bold tracking-widest flex justify-between items-center">
									Versions
									{#if selectedVersions.length > 0}
										<button onclick={() => selectedVersions = []} class="text-indigo-400 hover:text-indigo-300 normal-case tracking-normal font-normal">Clear</button>
									{/if}
								</label>
								<div class="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-slate-800/30 rounded-md border border-slate-800">
									{#each allVersions as v}
										<button
											onclick={() => {
												if (selectedVersions.includes(v)) selectedVersions = selectedVersions.filter(x => x !== v);
												else selectedVersions.push(v);
											}}
											class="text-[10px] px-2 py-0.5 rounded-full border transition-all {selectedVersions.includes(v) 
												? 'bg-pink-600 border-pink-500 text-white' 
												: 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}"
										>
											{v}
										</button>
									{/each}
								</div>
							</div>

							<button
								onclick={populateFromFilters}
								disabled={selectedTags.length === 0 && selectedVersions.length === 0}
								class="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold transition-colors disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
							>
								<Plus class="w-3.5 h-3.5" />
								Populate List
							</button>
						</div>
					</div>

					<div class="p-3 border-b border-slate-800 bg-slate-800/20">
						<div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
							<Search class="w-3 h-3" /> Individual Picker
						</div>
						<div
							class="flex items-center gap-2 bg-slate-800 rounded-md px-2.5 py-1.5 border border-slate-700 focus-within:border-indigo-500 transition-colors"
						>
							<input
								bind:value={songSearch}
								type="text"
								placeholder="Search maps..."
								class="bg-transparent text-xs text-white outline-none flex-1 placeholder-slate-500"
							/>
						</div>
					</div>
					<div class="flex-1 overflow-y-auto p-2 space-y-1">
						{#each filteredSongs as song (song.mapName)}
							{@const inList = (selectedList.items || []).some(
								(i: any) => i.mapName === song.mapName,
							)}
							<button
								onclick={() => addSongToList(song)}
								disabled={inList}
								class="w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors {inList
									? 'opacity-40 cursor-not-allowed'
									: 'hover:bg-slate-800'}"
							>
								{#if getSongThumbnail(song)}
									<img
										src={getSongThumbnail(song)}
										class="w-7 h-7 rounded object-cover flex-shrink-0"
										alt=""
									/>
								{:else}
									<div
										class="w-7 h-7 bg-slate-700 rounded flex-shrink-0"
									></div>
								{/if}
								<div class="min-w-0">
									<p
										class="text-xs font-medium text-white truncate"
									>
										{song.title || song.mapName}
									</p>
									<p class="text-xs text-slate-500 truncate">
										{song.artist}
									</p>
								</div>
								{#if inList}
									<span
										class="ml-auto text-xs text-green-400 flex-shrink-0"
										>✓</span
									>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</main>
</div>

{#if showNewModal}
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
	>
		<div
			class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm p-6"
		>
			<h3 class="text-lg font-bold text-white mb-4">Create Item List</h3>
			<input
				type="text"
				bind:value={newListName}
				placeholder="e.g. all_songs_party"
				class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white font-mono text-sm focus:border-indigo-500 outline-none mb-5"
			/>
			<div class="flex justify-end gap-3">
				<button
					onclick={() => {
						showNewModal = false;
						newListName = "";
					}}
					class="px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
					>Cancel</button
				>
				<button
					onclick={createList}
					class="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
					>Create</button
				>
			</div>
		</div>
	</div>
{/if}
