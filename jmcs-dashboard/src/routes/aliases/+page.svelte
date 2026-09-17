<script lang="ts">
	import { onMount } from "svelte";
	import { fetchApi } from "$lib/api";
	import {
		Tag,
		Plus,
		Edit2,
		Trash2,
		Search,
		RefreshCw,
		Info,
		Languages,
		ChevronRight,
		Palette,
		Target,
		Globe,
		Lock,
		ExternalLink,
	} from "lucide-svelte";
	import JsonEditor from "$lib/components/JsonEditor.svelte";
	import { triggerRefresh } from "$lib/jmcs";
	import PageHeader from "$lib/components/PageHeader.svelte";

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

	// --- Data Fetching ---
	async function loadData() {
		loading = true;
		error = null;
		try {
			const res = await fetchApi<any>("manage-aliases/list");
			items = res.items || [];

			// Extract all loc IDs to fetch previews
			const locIds = new Set<number>();
			items.forEach((item) => {
				if (item.StringLocID) locIds.add(item.StringLocID);
				if (item.StringLocIDFemale) locIds.add(item.StringLocIDFemale);
				if (item.DescriptionLocID) locIds.add(item.DescriptionLocID);
			});

			if (locIds.size > 0) {
				fetchLocPreviews(Array.from(locIds));
			}
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	async function fetchLocPreviews(ids: number[]) {
		try {
			// We might need a specialized endpoint for batch fetching locs by ID
			// For now, let's assume we can query them or we'll just show IDs if not available
			// Optimization: only fetch what we don't have
			const toFetch = ids.filter((id) => !locPreviews[id]);
			if (toFetch.length === 0) return;

			// In a real app, you'd have a batch endpoint.
			// For now, let's try to get them from the manage-locs if it supports IDs
			// Or we just fetch the list and filter (not ideal for large sets)
			const res = await fetchApi<any>(`manage-locs/list?limit=1000`);
			if (res && res.items) {
				const newPreviews = { ...locPreviews };
				res.items.forEach((loc: any) => {
					if (ids.includes(Number(loc.locId))) {
						newPreviews[Number(loc.locId)] =
							loc.strings?.en || `Loc ${loc.locId}`;
					}
				});
				locPreviews = newPreviews;
			}
		} catch (e) {
			console.error("Failed to fetch loc previews:", e);
		}
	}

	onMount(loadData);

	// --- Actions ---
	function openCreate() {
		modalMode = "create";
		currentItem = {
			aliasId: "",
			StringLocID: 0,
			StringLocIDFemale: 0,
			DescriptionLocID: 0,
			StringPlaceholder: "",
			DifficultyColor: 0,
			UnlockObjectives: {
				common: {
					__class: "JD_UnlockObjective_Count",
					Description: 0,
					MinimumValue: 0,
					ObjectiveType: 1,
				},
			},
		};
		showModal = true;
	}

	function openEdit(item: any) {
		modalMode = "edit";
		currentItem = JSON.parse(JSON.stringify(item));
		showModal = true;
	}

	async function handleDelete(aliasId: string) {
		if (!confirm(`Delete alias "${aliasId}"?`)) return;
		try {
			await fetchApi(`manage-aliases/delete/${aliasId}`, {
				method: "DELETE",
			});
			loadData();
			triggerRefresh();
		} catch (e: any) {
			alert("Delete failed: " + e.message);
		}
	}

	async function handleSave() {
		if (!currentItem.aliasId) return alert("Alias ID is required");
		saving = true;
		try {
			await fetchApi(`manage-aliases/upsert/${currentItem.aliasId}`, {
				method: "POST",
				body: JSON.stringify(currentItem),
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

	const difficultyMap: Record<number, { label: string; color: string }> = {
		0: { label: "Easy", color: "#34d399" }, // Green
		1: { label: "Normal", color: "#fbbf24" }, // Yellow
		2: { label: "Hard", color: "#f87171" }, // Red
		3: { label: "Extreme", color: "#a78bfa" }, // Purple
		4: { label: "Master", color: "#6366f1" }, // Indigo
		5: { label: "Legend", color: "#f472b6" }, // Pink
	};

	const filteredItems = $derived(
		items.filter(
			(item) =>
				(item.aliasId || "")
					.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				(item.StringPlaceholder || "")
					.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				(locPreviews[item.StringLocID] || "")
					.toLowerCase()
					.includes(searchQuery.toLowerCase()),
		),
	);
</script>

<div class="p-6 space-y-6 max-w-[1600px] mx-auto">
	<!-- Header -->
	<PageHeader
		title="Alias Management"
		description="Manage player titles ({items.length} total), localization, and unlock objectives."
		icon={Tag}
	>
		{#snippet children()}
			<div
				class="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-2 w-72 focus-within:border-indigo-500/50 transition-all backdrop-blur-md"
			>
				<Search class="w-4 h-4 text-slate-500" />
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search aliases..."
					class="bg-transparent text-sm text-white outline-none w-full placeholder-slate-600"
				/>
			</div>
		{/snippet}

		{#snippet actions()}
			<button
				onclick={openCreate}
				class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
			>
				<Plus class="w-4 h-4" /> Create Alias
			</button>
		{/snippet}
	</PageHeader>

	{#if loading}
		<div
			class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
		>
			{#each Array(12) as _}
				<div
					class="h-44 bg-slate-900 animate-pulse rounded-2xl border border-slate-800"
				></div>
			{/each}
		</div>
	{:else if error}
		<div
			class="bg-red-500/10 border border-red-500/20 rounded-2xl p-12 text-center"
		>
			<div
				class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 text-red-500 mb-4"
			>
				<Trash2 class="w-8 h-8" />
			</div>
			<h3 class="text-xl font-bold text-white mb-2">
				Failed to load aliases
			</h3>
			<p class="text-slate-400 mb-6 max-w-md mx-auto">{error}</p>
			<button
				onclick={loadData}
				class="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-xl font-medium transition-colors"
				>Try Again</button
			>
		</div>
	{:else}
		<div
			class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
		>
			{#each filteredItems as item (item.aliasId)}
				<div
					class="group bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all duration-300 flex flex-col gap-4 backdrop-blur-sm relative"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<h3
									class="text-white font-bold truncate text-lg"
								>
									{item.StringPlaceholder || item.aliasId}
								</h3>
								<div
									class="w-3 h-3 rounded-full border border-white/20 shadow-sm"
									style="background-color: {difficultyMap[
										item.DifficultyColor
									]?.color || '#94a3b8'}"
									title="Difficulty: {difficultyMap[
										item.DifficultyColor
									]?.label || item.DifficultyColor}"
								></div>
							</div>
							<p
								class="text-xs text-indigo-400 font-medium flex items-center gap-1"
							>
								<Globe class="w-3 h-3" />
								{locPreviews[item.StringLocID] ||
									`Loc ID: ${item.StringLocID}`}
							</p>
							<p class="text-[9px] text-slate-600 font-mono mt-1">
								ID: {item.aliasId}
							</p>
						</div>
						<div
							class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
						>
							<button
								onclick={() => openEdit(item)}
								class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
								><Edit2 class="w-3.5 h-3.5" /></button
							>
							<button
								onclick={() => handleDelete(item.aliasId)}
								class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
								><Trash2 class="w-3.5 h-3.5" /></button
							>
						</div>
					</div>

					<div class="space-y-2">
						<div
							class="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500 font-bold"
						>
							<span>Unlock Objectives</span>
							<span
								class="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400"
							>
								{item.UnlockObjectives
									? Object.keys(item.UnlockObjectives).filter(
											(k) =>
												item.UnlockObjectives[k] !==
												null,
										).length
									: 0}
							</span>
						</div>
						<div class="flex flex-wrap gap-1.5 min-h-[24px]">
							{#if item.UnlockObjectives}
								{#each Object.entries(item.UnlockObjectives) as [key, obj]}
									{#if obj}
										<div
											class="px-2 py-1 bg-slate-800/80 rounded-lg border border-slate-700/50 text-[10px] text-slate-300 flex items-center gap-1.5"
										>
											<Target
												class="w-2.5 h-2.5 text-indigo-400"
											/>
											<span
												class="font-bold text-slate-400"
												>{key}:</span
											>
											<span
												>{(obj as any).MinimumValue ??
													(obj as any).Value ??
													"Set"}</span
											>
										</div>
									{:else}
										<div
											class="px-2 py-1 bg-slate-800/30 rounded-lg border border-dashed border-slate-800 text-[10px] text-slate-600 flex items-center gap-1.5"
										>
											<span class="font-bold">{key}:</span
											>
											<span>None</span>
										</div>
									{/if}
								{/each}
							{:else}
								<span class="text-[10px] text-slate-700 italic"
									>No objectives defined</span
								>
							{/if}
						</div>
					</div>

					<div
						class="mt-auto pt-4 flex items-center justify-between border-t border-slate-800/50"
					>
						<div class="flex gap-2">
							<span class="text-[9px] font-mono text-slate-600"
								>L: {item.StringLocID}</span
							>
							{#if item.DescriptionLocID}<span
									class="text-[9px] font-mono text-slate-600"
									>D: {item.DescriptionLocID}</span
								>{/if}
						</div>
						<div class="flex items-center gap-3">
							{#if item.StringLocIDFemale}
								<span
									class="text-[9px] text-pink-500/50 font-bold"
									title="Female variant: {item.StringLocIDFemale}"
									>♀</span
								>
							{/if}
							{#if item.RestrictedToUnlimitedSongs}
								<span
									class="text-[9px] text-amber-500/50 font-bold"
									title="Unlimited Restricted">U</span
								>
							{/if}
						</div>
					</div>
				</div>
			{:else}
				<div class="col-span-full py-24 text-center">
					<div
						class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-900 text-slate-700 mb-4 border border-slate-800"
					>
						<Tag class="w-10 h-10" />
					</div>
					<h3 class="text-xl font-bold text-white mb-2">
						No aliases found
					</h3>
					<p class="text-slate-500 max-w-md mx-auto">
						Try adjusting your search query or create a new alias to
						get started.
					</p>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal -->
{#if showModal && currentItem}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div
			class="absolute inset-0 bg-black/60 backdrop-blur-md"
			onclick={() => (showModal = false)}
		></div>

		<div
			class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl relative z-10 overflow-hidden"
		>
			<!-- Modal Header -->
			<div
				class="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm"
			>
				<div class="flex items-center gap-3">
					<div class="p-2 bg-indigo-600/20 rounded-xl">
						<svelte:component
							this={modalMode === "edit" ? Edit2 : Plus}
							class="w-5 h-5 text-indigo-500"
						/>
					</div>
					<div>
						<h2 class="text-xl font-bold text-white">
							{modalMode === "edit" ? "Edit" : "Create"} Alias
						</h2>
						<p class="text-xs text-slate-400">
							Configure title properties and unlock requirements.
						</p>
					</div>
				</div>
				<button
					onclick={() => (showModal = false)}
					class="text-slate-400 hover:text-white transition-colors text-2xl font-light"
				>
					&times;
				</button>
			</div>

			<!-- Modal Body -->
			<div class="p-6 overflow-y-auto flex-1 space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label
							class="text-[10px] font-bold uppercase tracking-wider text-slate-500"
							>Alias ID</label
						>
						<input
							type="text"
							bind:value={currentItem.aliasId}
							readonly={modalMode === "edit"}
							placeholder="e.g. MasterOfDance"
							class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-all read-only:opacity-50"
						/>
					</div>
					<div class="space-y-1.5">
						<label
							class="text-[10px] font-bold uppercase tracking-wider text-slate-500"
							>Difficulty Color</label
						>
						<select
							bind:value={currentItem.DifficultyColor}
							class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-all"
						>
							<option value={0}>Green (Easy)</option>
							<option value={1}>Yellow (Normal)</option>
							<option value={2}>Red (Hard)</option>
							<option value={3}>Purple (Extreme)</option>
						</select>
					</div>
				</div>

				<div class="space-y-4 border-t border-slate-800 pt-4">
					<h3
						class="text-sm font-bold text-white flex items-center gap-2"
					>
						<Languages class="w-4 h-4 text-indigo-400" />
						Localization Settings
					</h3>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-1.5">
							<label
								class="text-[10px] font-bold uppercase tracking-wider text-slate-500"
								>String Loc ID (Male/Default)</label
							>
							<div class="flex gap-2">
								<input
									type="number"
									bind:value={currentItem.StringLocID}
									class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
								/>
								<a
									href="/locs"
									target="_blank"
									class="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors"
									title="Open Locs Page"
								>
									<ExternalLink class="w-4 h-4" />
								</a>
							</div>
							{#if locPreviews[currentItem.StringLocID]}
								<p
									class="text-[10px] text-indigo-400 font-medium italic truncate"
								>
									"{locPreviews[currentItem.StringLocID]}"
								</p>
							{/if}
						</div>
						<div class="space-y-1.5">
							<label
								class="text-[10px] font-bold uppercase tracking-wider text-slate-500"
								>Female Variant ID (Optional)</label
							>
							<input
								type="number"
								bind:value={currentItem.StringLocIDFemale}
								class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
							/>
						</div>
					</div>
					<div class="space-y-1.5">
						<label
							class="text-[10px] font-bold uppercase tracking-wider text-slate-500"
							>Description Loc ID</label
						>
						<input
							type="number"
							bind:value={currentItem.DescriptionLocID}
							class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
						/>
					</div>
					<div class="space-y-1.5">
						<label
							class="text-[10px] font-bold uppercase tracking-wider text-slate-500"
							>Fallback Text (StringPlaceholder)</label
						>
						<input
							type="text"
							bind:value={currentItem.StringPlaceholder}
							class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
						/>
					</div>
				</div>

				<div class="space-y-4 border-t border-slate-800 pt-6">
					<h3
						class="text-sm font-bold text-white flex items-center gap-2"
					>
						<Target class="w-4 h-4 text-amber-500" />
						Unlock Objectives
					</h3>
					<JsonEditor
						value={JSON.stringify(
							currentItem.UnlockObjectives || {},
							null,
							2,
						)}
						onchange={(val) => {
							try {
								currentItem.UnlockObjectives = JSON.parse(val);
							} catch (e) {}
						}}
					/>
					<p class="text-[10px] text-slate-500">
						Configure objectives per game version (e.g. "common",
						"jd2021-pc-live").
					</p>
				</div>
			</div>

			<!-- Modal Footer -->
			<div
				class="p-6 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/50 backdrop-blur-sm"
			>
				<button
					onclick={() => (showModal = false)}
					class="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
					>Cancel</button
				>
				<button
					onclick={handleSave}
					disabled={saving || !currentItem.aliasId}
					class="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
				>
					{#if saving}
						<RefreshCw class="w-4 h-4 animate-spin" /> Saving...
					{:else}
						{modalMode === "edit" ? "Update Alias" : "Create Alias"}
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
