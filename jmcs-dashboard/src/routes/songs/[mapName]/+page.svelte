<script lang="ts">
	import { fetchApi } from "$lib/api";
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import {
		Save,
		X,
		ArrowLeft,
		Music,
		Gamepad2,
		Palette,
		Files,
		Code2,
		Info,
		ExternalLink,
		Plus,
		Trash2,
		Copy,
		Download,
		Search,
	} from "lucide-svelte";
	import JsonEditor from "$lib/components/JsonEditor.svelte";
	import { toast } from "$lib/toast";

	const { mapName } = $page.params;

	let song: any = $state(null);
	let loading = $state(true);
	let saving = $state(false);
	let activeTab = $state("general");
	let scrollContainer: HTMLElement | null = $state(null);

	let availableTags: any[] = $state([]);
	let jdVersionOverrides: Record<string, string> = $state({});
	let showTagPicker = $state(false);
	let tagSearchQuery = $state("");

	let filteredAvailableTags = $derived(
		availableTags.filter(
			(t) =>
				t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()) &&
				!(song?.tags || []).find((st: any) => (st._id || st) === t._id),
		),
	);

	$effect(() => {
		if (activeTab && scrollContainer) {
			requestAnimationFrame(() => {
				if (scrollContainer) scrollContainer.scrollTop = 0;
			});
		}
	});

	const tabs = [
		{ id: "general", label: "General Info", icon: Info },
		{ id: "gameplay", label: "Gameplay", icon: Gamepad2 },
		{ id: "visuals", label: "Visuals & Colors", icon: Palette },
		{ id: "assets", label: "Assets & Files", icon: Files },
		{ id: "raw", label: "Raw Data", icon: Code2 },
	];

	const ENUMS = {
		difficulty: ["NA", "Easy", "Normal", "Hard", "Extreme"],
		mode: [
			"Classic",
			"Mashup",
			"PartyMaster",
			"Sweat",
			"Battle",
			"OnStage",
			"Max",
		],
		status: ["Unavailable", "Hidden", "Locked", "Available"],
	};

	onMount(async () => {
		try {
			const [res, tagsRes, constantsRes] = await Promise.all([
				fetchApi<any>(`manage-songs/get/${mapName}`),
				fetchApi<any>("manage-tags/list?limit=9999"),
				fetchApi<any>("/constant-provider/v1/sku-constants"),
			]);
			song = res.song;
			availableTags = (tagsRes.items || []).sort((a: any, b: any) =>
				a.name.localeCompare(b.name),
			);
			if (constantsRes?.JDVersion?.Override) {
				jdVersionOverrides = constantsRes.JDVersion.Override;
			}
		} catch (e: any) {
			console.error("Failed to fetch data:", e);
		} finally {
			loading = false;
		}
	});

	async function save() {
		saving = true;
		try {
			const payload = { ...song };
			payload.tags = (payload.tags || []).map((t: any) =>
				typeof t === "object" ? t._id : t,
			);

			await fetchApi(`manage-songs/update/${mapName}`, {
				method: "PUT",
				body: JSON.stringify(payload),
			});
			toast.success(`Successfully saved "${mapName}""`);
		} catch (e: any) {
			toast.error("Save failed: " + e.message);
		} finally {
			saving = false;
		}
	}

	function handleJsonChange(field: string, value: string) {
		try {
			song[field] = JSON.parse(value);
		} catch (e) {
			// Invalid JSON, wait for user to fix it
		}
	}

	function deleteSong() {
		if (
			confirm(
				"Are you sure you want to delete this song? This cannot be undone.",
			)
		) {
			fetchApi(`manage-songs/delete/${mapName}`, { method: "DELETE" })
				.then(() => {
					toast.success(`Successfully deleted "${song.title}"`);
					goto("/songs");
				})
				.catch((e) => {
					toast.error("Delete failed: " + e.message);
				});
		}
	}

	function downloadUrl(url: string) {
		if (!url) return;
		window.open(url, "_blank");
	}

	function extractUrls(obj: any): string[] {
		const urls: string[] = [];
		const walk = (o: any) => {
			if (!o) return;
			if (typeof o === "string" && o.startsWith("http")) urls.push(o);
			else if (typeof o === "object") Object.values(o).forEach(walk);
		};
		walk(obj);
		return [...new Set(urls)];
	}

	const allAssetUrls = $derived(
		extractUrls({
			assets: song?.assets,
			packages: song?.packages,
			urls: song?.urls,
		}),
	);
</script>

{#if loading}
	<div class="flex flex-col items-center justify-center min-h-[60vh] gap-4">
		<div
			class="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"
		></div>
		<p class="text-slate-400 animate-pulse font-medium">
			Loading song data...
		</p>
	</div>
{:else if !song}
	<div class="text-center py-20">
		<h2 class="text-2xl font-bold text-white">Song Not Found</h2>
		<p class="text-slate-400 mt-2">
			The song "{mapName}" could not be located.
		</p>
		<button
			onclick={() => goto("/songs")}
			class="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
		>
			Back to Library
		</button>
	</div>
{:else}
	<div
		class="max-w-[1400px] mx-auto h-[calc(100vh-100px)] flex flex-col gap-6"
	>
		<!-- Header Area -->
		<div
			class="flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-xl shadow-xl"
		>
			<div class="flex items-center gap-4">
				<button
					onclick={() => goto("/songs")}
					class="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
				>
					<ArrowLeft class="w-5 h-5" />
				</button>
				<div>
					<h1 class="text-2xl font-black text-white tracking-tight">
						{song.title || "Untitled Song"}
					</h1>
					<p
						class="text-slate-500 text-xs font-mono uppercase tracking-widest"
					>
						{song.mapName} • {song.artist || "Unknown Artist"}
					</p>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<button
					onclick={deleteSong}
					class="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-sm font-bold transition-all border border-red-500/20 active:scale-95"
					title="Delete Song"
				>
					<Trash2 class="w-4 h-4" /> Delete
				</button>
				<button
					onclick={() => goto("/songs")}
					class="px-5 py-2.5 text-slate-400 hover:text-white font-bold text-sm transition-all"
				>
					Discard
				</button>
				<button
					onclick={save}
					disabled={saving}
					class="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-bold text-sm shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
				>
					{#if saving}
						<div
							class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"
						></div>
						Saving...
					{:else}
						<Save class="w-4 h-4" />
						Save Changes
					{/if}
				</button>
			</div>
		</div>

		<div class="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
			<!-- Sidebar Navigation -->
			<div class="lg:w-64 flex-shrink-0">
				<nav class="space-y-1">
					{#each tabs as tab}
						<button
							onclick={() => (activeTab = tab.id)}
							class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm {activeTab ===
							tab.id
								? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
								: 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}"
						>
							<tab.icon class="w-4 h-4" />
							{tab.label}
						</button>
					{/each}
				</nav>
			</div>

			<!-- Main Content Area -->
			<div
				bind:this={scrollContainer}
				class="flex-1 min-w-0 overflow-y-auto custom-scrollbar pr-4 pb-20"
			>
				{#if activeTab === "general"}
					<section
						class="bg-slate-900/40 rounded-3xl border border-slate-800 p-8 space-y-8"
					>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
							<div class="space-y-2">
								<label
									class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1"
									>Song Title</label
								>
								<input
									bind:value={song.title}
									type="text"
									placeholder="Enter title..."
									class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white outline-none focus:border-indigo-500 transition-all font-medium"
								/>
							</div>
							<div class="space-y-2">
								<label
									class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1"
									>Artist Name</label
								>
								<input
									bind:value={song.artist}
									type="text"
									placeholder="Enter artist..."
									class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white outline-none focus:border-indigo-500 transition-all font-medium"
								/>
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
							<div class="space-y-2">
								<label
									class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1"
									>Original JD Version</label
								>
								<select
									bind:value={song.originalJDVersion}
									class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white outline-none focus:border-indigo-500 transition-all font-medium appearance-none"
								>
									{#if song.originalJDVersion !== undefined && song.originalJDVersion !== null && !jdVersionOverrides[song.originalJDVersion]}
										<option value={song.originalJDVersion}
											>Just Dance {song.originalJDVersion}
											(Unknown)</option
										>
									{/if}
									{#each Object.entries(jdVersionOverrides).sort((a, b) => Number(a[0]) - Number(b[0])) as [key, value]}
										<option value={Number(key)}
											>Just Dance {value}</option
										>
									{/each}
								</select>
							</div>
							<div class="space-y-2">
								<label
									class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1"
									>Publishing</label
								>
								<div
									class="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3"
								>
									<!-- Status badge -->
									{#if typeof song.releaseDate === 'string' && song.releaseDate.length > 0 && new Date(song.releaseDate) <= new Date()}
										<div class="flex items-center gap-2">
											<span class="text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-lg">Published</span>
											{#if song.isPatreon}<span class="text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-lg">Patreon</span>{/if}
										</div>
									{:else if typeof song.releaseDate === 'string' && song.releaseDate.length > 0 && new Date(song.releaseDate) > new Date()}
										<div class="flex items-center gap-2">
											<span class="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg">Scheduled</span>
											{#if song.isPatreon}<span class="text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-lg">Patreon</span>{/if}
										</div>
									{:else}
										<div class="flex items-center gap-2">
											<span class="text-xs font-bold text-slate-500 bg-slate-800 px-3 py-1 rounded-lg">Draft</span>
											{#if song.isPatreon}<span class="text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-lg">Patreon</span>{/if}
										</div>
									{/if}

									<!-- Date input for scheduling -->
									<div class="flex items-center gap-2">
										<input
											value={song.releaseDate ? song.releaseDate.split('T')[0] : ''}
											onchange={(e) => {
												const val = (e.target as HTMLInputElement).value;
												song.releaseDate = val ? new Date(val + 'T00:00:00.000Z').toISOString() : '';
											}}
											type="date"
											class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-indigo-500 transition-all appearance-none"
										/>
										<button
											onclick={() => { song.releaseDate = ''; }}
											class="px-3 py-2 text-xs font-bold text-slate-500 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
											title="Clear date"
										>&times;</button>
									</div>

									<!-- Quick actions -->
									<div class="flex gap-2">
										<button
											onclick={() => { song.releaseDate = new Date().toISOString(); }}
											class="flex-1 px-3 py-2 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded-xl text-xs font-bold transition-all"
										>
											Publish Now
										</button>
										<button
											onclick={() => {
												const d = new Date(Date.now() + 86400000);
												song.releaseDate = d.toISOString();
											}}
											class="flex-1 px-3 py-2 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded-xl text-xs font-bold transition-all"
										>
											Schedule Tomorrow
										</button>
									</div>

									<!-- Info text -->
									{#if typeof song.releaseDate === 'string' && song.releaseDate.length > 0 && new Date(song.releaseDate) <= new Date()}
										<p class="text-[10px] text-green-500/70">Published {new Date(song.releaseDate).toUTCString()}</p>
									{:else if typeof song.releaseDate === 'string' && song.releaseDate.length > 0 && new Date(song.releaseDate) > new Date()}
										<p class="text-[10px] text-amber-500/70">Scheduled for {new Date(song.releaseDate).toUTCString()} ({Math.ceil((new Date(song.releaseDate).getTime() - Date.now()) / 86400000)} days away)</p>
									{:else}
										<p class="text-[10px] text-slate-600">No release date set — song is in draft/dev-only mode.</p>
									{/if}
								</div>
							</div>
							<div class="space-y-2">
								<label
									class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1"
									>Patreon Exclusive</label
								>
								<div
									class="flex items-center gap-4 h-[48px] bg-slate-950 border border-slate-800 rounded-2xl px-5"
								>
									<button
										onclick={() => (song.isPatreon = !song.isPatreon)}
										class="relative w-12 h-6 rounded-full transition-all {song.isPatreon
											? 'bg-purple-600'
											: 'bg-slate-700'}"
									>
										<div
											class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all {song.isPatreon
												? 'left-6'
												: 'left-0.5'}"
										></div>
									</button>
									<span class="text-sm font-bold {song.isPatreon ? 'text-purple-400' : 'text-slate-500'}">
										{song.isPatreon ? 'Yes — visible to patrons only' : 'No — public song'}
									</span>
								</div>
							</div>
							<div class="space-y-2">
								<label
									class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1"
									>Status</label
								>
								<select
									bind:value={song.status}
									class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white outline-none focus:border-indigo-500 transition-all font-medium appearance-none"
								>
									{#each ENUMS.status as label, i}
										<option value={i}>{label}</option>
									{/each}
								</select>
							</div>
						</div>

						<div class="space-y-2">
							<label
								class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1"
								>Credits & Legal</label
							>
							<textarea
								bind:value={song.credits}
								rows="4"
								placeholder="Copyright information..."
								class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white outline-none focus:border-indigo-500 transition-all font-medium resize-none text-sm leading-relaxed"
							></textarea>
						</div>

						<div class="space-y-4">
							<label
								class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1"
								>Tags</label
							>
							<div class="flex flex-wrap items-center gap-2">
								{#each song.tags || [] as tag, i}
									<div
										class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold shadow-sm"
										style="background-color: {tag.color
											? tag.color + '20'
											: 'rgba(79, 70, 229, 0.1)'}; color: {tag.color ||
											'#818cf8'}; border-color: {tag.color
											? tag.color + '40'
											: 'rgba(79, 70, 229, 0.2)'};"
									>
										{tag.name || tag}
										<button
											onclick={() =>
												song.tags.splice(i, 1)}
											class="hover:text-white transition-colors"
										>
											<X class="w-3 h-3" />
										</button>
									</div>
								{/each}

								<div class="relative inline-block">
									<button
										onclick={() => {
											showTagPicker = true;
											tagSearchQuery = "";
										}}
										class="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700 transition-all"
									>
										<Plus class="w-3 h-3" /> Add Tag
									</button>
								</div>
							</div>
						</div>
					</section>

					<!-- Tag Picker Modal -->
					{#if showTagPicker}
						<div
							class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
							onclick={() => (showTagPicker = false)}
						>
							<div
								class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
								onclick={(e) => e.stopPropagation()}
							>
								<div
									class="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50"
								>
									<h2 class="text-base font-black text-white">
										Add Tags
									</h2>
									<button
										onclick={() => (showTagPicker = false)}
										class="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
									>
										<X class="w-4 h-4" />
									</button>
								</div>

								<div class="p-4 border-b border-slate-800">
									<div class="relative w-full">
										<Search
											class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
										/>
										<input
											type="text"
											bind:value={tagSearchQuery}
											placeholder="Search for a tag..."
											class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
										/>
									</div>
								</div>

								<div class="p-2 overflow-y-auto flex-1">
									<div class="flex flex-col gap-1">
										{#each filteredAvailableTags as t}
											<button
												onclick={() => {
													song.tags = [
														...(song.tags || []),
														t,
													];
													tagSearchQuery = "";
												}}
												class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-all text-left group"
											>
												<div
													class="w-3 h-3 rounded-full shadow-sm"
													style="background-color: {t.color ||
														'#4f46e5'}"
												></div>
												<div class="flex-1">
													<div
														class="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors"
													>
														{t.name}
													</div>
													{#if t.description}
														<div
															class="text-[10px] text-slate-500 line-clamp-1 mt-0.5"
														>
															{t.description}
														</div>
													{/if}
												</div>
												<Plus
													class="w-4 h-4 text-slate-600 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all"
												/>
											</button>
										{:else}
											<div
												class="text-center py-8 text-slate-500 text-sm"
											>
												{availableTags.length === 0
													? "No tags exist yet. Create some in Tag Management!"
													: "No matching tags found."}
											</div>
										{/each}
									</div>
								</div>
							</div>
						</div>
					{/if}
				{:else if activeTab === "gameplay"}
					<section
						class="bg-slate-900/40 rounded-3xl border border-slate-800 p-8 space-y-8"
					>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
							<div
								class="space-y-4 p-6 bg-slate-950/50 rounded-2xl border border-slate-800"
							>
								<h3
									class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"
								>
									<Music class="w-4 h-4 text-indigo-400" />
									Core Stats
								</h3>
								<div class="space-y-6">
									<div
										class="flex items-center justify-between"
									>
										<span
											class="text-xs font-bold text-slate-400 uppercase tracking-wider"
											>Coach Count</span
										>
										<div
											class="flex bg-slate-900 p-1 rounded-xl border border-slate-800"
										>
											{#each [1, 2, 3, 4] as count}
												<button
													onclick={() =>
														(song.coachCount =
															count)}
													class="px-4 py-1.5 rounded-lg text-xs font-black transition-all {song.coachCount ===
													count
														? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
														: 'text-slate-500 hover:text-slate-300'}"
												>
													{count}
												</button>
											{/each}
										</div>
									</div>
									<div
										class="flex items-center justify-between"
									>
										<span
											class="text-xs font-bold text-slate-400 uppercase tracking-wider"
											>Main Coach</span
										>
										<input
											bind:value={song.mainCoach}
											type="number"
											class="w-20 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-center text-white text-sm outline-none focus:border-indigo-500"
										/>
									</div>
									<div
										class="flex items-center justify-between"
									>
										<span
											class="text-xs font-bold text-slate-400 uppercase tracking-wider"
											>Map Length</span
										>
										<div class="flex items-center gap-2">
											<input
												bind:value={song.mapLength}
												type="number"
												step="0.0001"
												class="w-32 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-right text-white text-sm outline-none focus:border-indigo-500"
											/>
											<span
												class="text-[10px] font-bold text-slate-600"
												>SEC</span
											>
										</div>
									</div>
								</div>
							</div>

							<div
								class="space-y-4 p-6 bg-slate-950/50 rounded-2xl border border-slate-800"
							>
								<h3
									class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"
								>
									<Gamepad2 class="w-4 h-4 text-indigo-400" />
									Classification
								</h3>
								<div class="space-y-6">
									<div class="space-y-2">
										<label
											class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
											>Game Mode</label
										>
										<select
											bind:value={song.mode}
											class="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 appearance-none"
										>
											{#each ENUMS.mode as label, i}
												<option value={i}
													>{label}</option
												>
											{/each}
										</select>
									</div>
									<div class="grid grid-cols-2 gap-4">
										<div class="space-y-2">
											<label
												class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
												>Difficulty</label
											>
											<select
												bind:value={song.difficulty}
												class="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 appearance-none"
											>
												{#each ENUMS.difficulty as label, i}
													<option value={i}
														>{label}</option
													>
												{/each}
											</select>
										</div>
										<div class="space-y-2">
											<label
												class="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
												>Sweat</label
											>
											<select
												bind:value={
													song.sweatDifficulty
												}
												class="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 appearance-none"
											>
												{#each ENUMS.difficulty as label, i}
													<option value={i}
														>{label}</option
													>
												{/each}
											</select>
										</div>
									</div>
								</div>
							</div>
						</div>

						<div
							class="space-y-6 p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/10"
						>
							<div class="flex items-center justify-between">
								<div>
									<h4 class="text-white font-bold text-sm">
										Parent Relationship
									</h4>
									<p class="text-slate-500 text-[10px]">
										Specify if this song belongs to a parent
										map (e.g. for variations)
									</p>
								</div>
								<input
									bind:value={song.parentMapName}
									type="text"
									placeholder="Parent MapName..."
									class="w-64 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-indigo-500 transition-all font-mono"
								/>
							</div>
						</div>
					</section>
				{:else if activeTab === "visuals"}
					<section
						class="bg-slate-900/40 rounded-3xl border border-slate-800 p-8 space-y-12"
					>
						<div class="space-y-6">
							<h3
								class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"
							>
								<Palette class="w-4 h-4 text-indigo-400" />
								Color Palette
							</h3>

							<div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
								<!-- Theme 1 Group -->
								<div
									class="p-6 bg-slate-950/50 rounded-3xl border border-slate-800 space-y-6"
								>
									<h4
										class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]"
									>
										Theme 1 Colors
									</h4>
									<div
										class="grid grid-cols-1 md:grid-cols-2 gap-6"
									>
										<div
											class="flex items-center gap-6 group"
										>
											<label class="cursor-pointer">
												<input
													type="color"
													bind:value={
														song.songColor1A
													}
													class="sr-only"
												/>
												<div
													class="w-20 h-20 rounded-2xl shadow-inner border border-white/10 shrink-0 transition-transform active:scale-95 hover:border-white/30"
													style="background-color: {song.songColor1A}"
												></div>
											</label>
											<div class="flex-1 min-w-0">
												<p
													class="text-[10px] font-black text-slate-500 uppercase tracking-widest"
												>
													Primary
												</p>
												<div
													class="flex items-center gap-3 mt-2"
												>
													<input
														bind:value={
															song.songColor1A
														}
														type="text"
														class="bg-transparent text-white font-mono text-sm outline-none w-24"
													/>
												</div>
											</div>
										</div>
										<div
											class="flex items-center gap-6 group"
										>
											<label class="cursor-pointer">
												<input
													type="color"
													bind:value={
														song.songColor1B
													}
													class="sr-only"
												/>
												<div
													class="w-20 h-20 rounded-2xl shadow-inner border border-white/10 shrink-0 transition-transform active:scale-95 hover:border-white/30"
													style="background-color: {song.songColor1B}"
												></div>
											</label>
											<div class="flex-1 min-w-0">
												<p
													class="text-[10px] font-black text-slate-500 uppercase tracking-widest"
												>
													Accent
												</p>
												<div
													class="flex items-center gap-3 mt-2"
												>
													<input
														bind:value={
															song.songColor1B
														}
														type="text"
														class="bg-transparent text-white font-mono text-sm outline-none w-24"
													/>
												</div>
											</div>
										</div>
									</div>
								</div>

								<!-- Theme 2 Group -->
								<div
									class="p-6 bg-slate-950/50 rounded-3xl border border-slate-800 space-y-6"
								>
									<h4
										class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]"
									>
										Theme 2 Colors
									</h4>
									<div
										class="grid grid-cols-1 md:grid-cols-2 gap-6"
									>
										<div
											class="flex items-center gap-6 group"
										>
											<label class="cursor-pointer">
												<input
													type="color"
													bind:value={
														song.songColor2A
													}
													class="sr-only"
												/>
												<div
													class="w-20 h-20 rounded-2xl shadow-inner border border-white/10 shrink-0 transition-transform active:scale-95 hover:border-white/30"
													style="background-color: {song.songColor2A}"
												></div>
											</label>
											<div class="flex-1 min-w-0">
												<p
													class="text-[10px] font-black text-slate-500 uppercase tracking-widest"
												>
													Primary
												</p>
												<div
													class="flex items-center gap-3 mt-2"
												>
													<input
														bind:value={
															song.songColor2A
														}
														type="text"
														class="bg-transparent text-white font-mono text-sm outline-none w-24"
													/>
												</div>
											</div>
										</div>
										<div
											class="flex items-center gap-6 group"
										>
											<label class="cursor-pointer">
												<input
													type="color"
													bind:value={
														song.songColor2B
													}
													class="sr-only"
												/>
												<div
													class="w-20 h-20 rounded-2xl shadow-inner border border-white/10 shrink-0 transition-transform active:scale-95 hover:border-white/30"
													style="background-color: {song.songColor2B}"
												></div>
											</label>
											<div class="flex-1 min-w-0">
												<p
													class="text-[10px] font-black text-slate-500 uppercase tracking-widest"
												>
													Accent
												</p>
												<div
													class="flex items-center gap-3 mt-2"
												>
													<input
														bind:value={
															song.songColor2B
														}
														type="text"
														class="bg-transparent text-white font-mono text-sm outline-none w-24"
													/>
												</div>
											</div>
										</div>
									</div>
								</div>

								<!-- Lyrics Group -->
								<div
									class="p-6 bg-slate-950/50 rounded-3xl border border-slate-800 space-y-6 xl:col-span-2"
								>
									<h4
										class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]"
									>
										Lyrics Color
									</h4>
									<div class="flex items-center gap-6 group">
										<label class="cursor-pointer">
											<input
												type="color"
												bind:value={song.lyricsColor}
												class="sr-only"
											/>
											<div
												class="w-20 h-20 rounded-2xl shadow-inner border border-white/10 shrink-0 transition-transform active:scale-95 hover:border-white/30"
												style="background-color: {song.lyricsColor}"
											></div>
										</label>
										<div class="flex-1 min-w-0">
											<p
												class="text-[10px] font-black text-slate-500 uppercase tracking-widest"
											>
												Global Lyrics
											</p>
											<div
												class="flex items-center gap-3 mt-2"
											>
												<input
													bind:value={
														song.lyricsColor
													}
													type="text"
													class="bg-transparent text-white font-mono text-sm outline-none w-24"
												/>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
							<div
								class="space-y-4 p-6 bg-slate-950/50 rounded-2xl border border-slate-800"
							>
								<h4
									class="text-[10px] font-black text-slate-500 uppercase tracking-widest"
								>
									Promotion
								</h4>
								<div class="space-y-6">
									<div
										class="flex items-center justify-between"
									>
										<div>
											<p
												class="text-white font-bold text-sm"
											>
												Banner Theme
											</p>
											<p
												class="text-slate-500 text-[10px]"
											>
												Override UI theme for the song
												banner
											</p>
										</div>
										<input
											bind:value={song.bannerTheme}
											type="text"
											class="w-40 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-indigo-500"
										/>
									</div>
									<div
										class="flex items-center justify-between"
									>
										<div>
											<p
												class="text-white font-bold text-sm"
											>
												New Song Badge
											</p>
											<p
												class="text-slate-500 text-[10px]"
											>
												Displays the 'NEW' indicator in
												menus
											</p>
										</div>
										<button
											onclick={() =>
												(song.isNewSong =
													!song.isNewSong)}
											class="w-12 h-6 rounded-full transition-all relative {song.isNewSong
												? 'bg-indigo-600'
												: 'bg-slate-700'}"
										>
											<div
												class="absolute top-1 bottom-1 w-4 rounded-full bg-white transition-all {song.isNewSong
													? 'right-1'
													: 'left-1'} shadow-sm"
											></div>
										</button>
									</div>
								</div>
							</div>

							<div
								class="space-y-4 p-6 bg-slate-950/50 rounded-2xl border border-slate-800"
							>
								<h4
									class="text-[10px] font-black text-slate-500 uppercase tracking-widest"
								>
									Lyrics Type
								</h4>
								<div class="grid grid-cols-2 gap-2">
									{#each [0, 1] as type}
										<button
											onclick={() =>
												(song.lyricsType = type)}
											class="px-4 py-3 rounded-xl text-xs font-black transition-all border {song.lyricsType ===
											type
												? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
												: 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'}"
										>
											TYPE {type}
										</button>
									{/each}
								</div>
								<p
									class="text-[10px] text-slate-500 italic text-center"
								>
									0: Modern, 1: Classic Karaoke
								</p>
							</div>
						</div>
					</section>
				{:else if activeTab === "assets"}
					<section
						class="bg-slate-900/40 rounded-3xl border border-slate-800 p-8 space-y-12 overflow-hidden"
					>
						<div class="space-y-6">
							<div class="flex items-center justify-between">
								<h3
									class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"
								>
									<Files class="w-4 h-4 text-indigo-400" />
									Asset Management
								</h3>
							</div>

							{#if allAssetUrls.length > 0}
								<div
									class="p-6 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 space-y-4"
								>
									<h4
										class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]"
									>
										Detected File Assets ({allAssetUrls.length})
									</h4>
									<div
										class="grid grid-cols-1 md:grid-cols-2 gap-3"
									>
										{#each allAssetUrls as url}
											<div
												class="flex items-center justify-between bg-slate-950/50 p-3 rounded-xl border border-slate-800 group"
											>
												<span
													class="text-[10px] font-mono text-slate-400 truncate flex-1"
													title={url}
												>
													{url.split("/").pop()}
												</span>
												<div class="flex gap-2">
													<button
														onclick={() =>
															downloadUrl(url)}
														class="p-1.5 text-slate-500 hover:text-indigo-400 transition-all"
														title="Download / Open"
													>
														<Download
															class="w-3.5 h-3.5"
														/>
													</button>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							<div class="space-y-6">
								<div class="space-y-3">
									<h4
										class="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1"
									>
										Platform Assets (Structured)
									</h4>
									<div class="space-y-4">
										{#each ["nx", "pc", "ps4", "wiiu"] as platform}
											<div
												class="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden"
											>
												<div
													class="bg-slate-900 px-5 py-3 border-b border-slate-800 flex items-center justify-between"
												>
													<span
														class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]"
														>{platform} assets</span
													>
													<button
														onclick={() =>
															downloadUrl(
																song.packages?.[
																	platform
																]?.url,
															)}
														class="text-slate-500 hover:text-white transition-all"
														title="Download Scene Package"
													>
														<Download
															class="w-3.5 h-3.5"
														/>
													</button>
												</div>
												<div
													class="p-4 overflow-x-auto"
												>
													<JsonEditor
														value={JSON.stringify(
															song.assets?.[
																platform
															] || {},
														)}
														onchange={(v) => {
															if (!song.assets)
																song.assets =
																	{};
															song.assets[
																platform
															] = JSON.parse(v);
														}}
													/>
												</div>
											</div>
										{/each}
									</div>
								</div>

								<div class="space-y-3">
									<h4
										class="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1"
									>
										Legacy & Universal Assets
									</h4>
									<div
										class="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 overflow-x-auto"
									>
										<JsonEditor
											value={JSON.stringify(
												Object.fromEntries(
													Object.entries(
														song.assets || {},
													).filter(
														([k]) =>
															![
																"nx",
																"pc",
																"ps4",
																"wiiu",
															].includes(k),
													),
												),
											)}
											onchange={(v) => {
												const platformData =
													Object.fromEntries(
														Object.entries(
															song.assets || {},
														).filter(([k]) =>
															[
																"nx",
																"pc",
																"ps4",
																"wiiu",
															].includes(k),
														),
													);
												song.assets = {
													...platformData,
													...JSON.parse(v),
												};
											}}
										/>
									</div>
								</div>
							</div>
						</div>

						<div class="space-y-6">
							<h3
								class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"
							>
								<Music class="w-4 h-4 text-indigo-400" />
								Audio Preview Configuration
							</h3>
							<div
								class="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 overflow-x-auto"
							>
								<JsonEditor
									value={JSON.stringify(
										song.audioPreviewData || {},
									)}
									onchange={(v) =>
										(song.audioPreviewData = JSON.parse(v))}
								/>
							</div>
						</div>

						<div class="space-y-6">
							<h3
								class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"
							>
								<ExternalLink class="w-4 h-4 text-indigo-400" />
								Mapping URLs
							</h3>
							<div
								class="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 overflow-x-auto"
							>
								<JsonEditor
									value={JSON.stringify(song.urls || {})}
									onchange={(v) =>
										(song.urls = JSON.parse(v))}
								/>
							</div>
						</div>

						<div class="space-y-6">
							<h3
								class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"
							>
								<Files class="w-4 h-4 text-indigo-400" />
								Package Manifest
							</h3>
							<div
								class="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 overflow-x-auto"
							>
								<JsonEditor
									value={JSON.stringify(song.packages || {})}
									onchange={(v) =>
										(song.packages = JSON.parse(v))}
								/>
							</div>
						</div>
					</section>
				{:else if activeTab === "raw"}
					<section
						class="bg-slate-900/40 rounded-3xl border border-slate-800 p-8 space-y-8 overflow-hidden"
					>
						<div class="flex items-center justify-between">
							<h3
								class="text-sm font-black text-white uppercase tracking-widest"
							>
								Direct Document Edit
							</h3>
							<div class="flex gap-2">
								<button
									onclick={() => {
										navigator.clipboard.writeText(
											JSON.stringify(song, null, 2),
										);
									}}
									class="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
								>
									<Copy class="w-3.5 h-3.5" /> Copy JSON
								</button>
							</div>
						</div>

						<div
							class="p-6 bg-red-500/5 rounded-2xl border border-red-500/10"
						>
							<div class="flex items-center justify-between">
								<div>
									<h4 class="text-red-400 font-bold text-sm">
										Danger Zone
									</h4>
									<p class="text-slate-500 text-[10px]">
										Changes here bypass individual field
										validation. Use with caution.
									</p>
								</div>
							</div>
						</div>

						<div class="min-h-[200px] overflow-x-auto">
							<JsonEditor
								value={JSON.stringify(song, null, 2)}
								onchange={(v) => {
									try {
										const parsed = JSON.parse(v);
										Object.assign(song, parsed);
									} catch (e) {}
								}}
							/>
						</div>
					</section>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		background-image: radial-gradient(
				circle at 10% 20%,
				rgba(79, 70, 229, 0.05) 0%,
				transparent 40%
			),
			radial-gradient(
				circle at 90% 80%,
				rgba(220, 38, 38, 0.03) 0%,
				transparent 40%
			);
	}

	input[type="number"]::-webkit-inner-spin-button,
	input[type="number"]::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	select {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 1.25rem center;
		background-size: 1rem;
	}

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
</style>
