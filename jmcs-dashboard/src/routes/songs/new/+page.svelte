<script lang="ts">
	import { fetchApi } from "$lib/api";
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
		Plus,
		Search,
	} from "lucide-svelte";
	import JsonEditor from "$lib/components/JsonEditor.svelte";
	import { onMount } from "svelte";
	import { toast } from "$lib/toast";

	let song: any = $state({
		mapName: "",
		title: "",
		artist: "",
		originalJDVersion: 2024,
		coachCount: 1,
		difficulty: 1,
		sweatDifficulty: 1,
		songColor1A: "#ffffff",
		songColor1B: "#000000",
		songColor2A: "#ffffff",
		songColor2B: "#000000",
		lyricsColor: "#ffffff",
		credits: "",
		audioPreviewData: {
			__class: "MusicTrackData",
			structure: {
				__class: "MusicTrackStructure",
				markers: [],
				signatures: [
					{
						__class: "MusicSignature",
						marker: 0,
						beats: 4,
					},
				],
				startBeat: 0,
				endBeat: 0,
				fadeStartBeat: 0,
				useFadeStartBeat: false,
				fadeEndBeat: 0,
				useFadeEndBeat: false,
				videoStartTime: 0,
				previewEntry: 0,
				previewLoopStart: 0,
				previewLoopEnd: 0,
				volume: 0,
				fadeInDuration: 0,
				fadeInType: 0,
				fadeOutDuration: 0,
				fadeOutType: 0,
			},
			path: "",
			url: "",
		},
		assets: {},
		urls: {},
		packages: {},
		mapPreviewMpd: "",
		mapLength: 0,
		jdmAttributes: [],
		mainCoach: -1,
		lyricsType: 0,
		mode: 6,
		status: 3,
		tags: [],
		parentMapName: "",
		skuIds: [],
		serverChangelist: 0,
		customTypeNameId: 4294967295,
		customTypeName: "",
		searchTagsLocIds: [],
		bannerTheme: "",
		releaseDate: "",
		isNewSong: true,
	});

	let saving = $state(false);
	let activeTab = $state("general");

	let availableTags: any[] = $state([]);
	let showTagPicker = $state(false);
	let tagSearchQuery = $state("");

	let filteredAvailableTags = $derived(
		availableTags.filter(
			(t) =>
				t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()) &&
				!(song?.tags || []).find((st: any) => (st._id || st) === t._id),
		),
	);

	onMount(async () => {
		try {
			const tagsRes = await fetchApi<any>("manage-tags/list?limit=9999");
			availableTags = (tagsRes.items || []).sort((a: any, b: any) =>
				a.name.localeCompare(b.name),
			);

			// Auto-select Main tag if found
			const mainTag = availableTags.find((t) => t.name === "Main");
			if (mainTag) {
				song.tags = [mainTag._id];
			}
		} catch (e: any) {
			console.error("Failed to load tags:", e);
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

	async function save() {
		if (!song.mapName) return alert("Map Name is required");
		saving = true;
		try {
			await fetchApi(`manage-songs/create`, {
				method: "POST",
				body: JSON.stringify(song),
			});
			goto(`/songs/${song.mapName}`);
		} catch (e: any) {
			alert("Creation failed: " + e.message);
		} finally {
			saving = false;
		}
	}
</script>

<div class="max-w-[1400px] mx-auto space-y-6 pb-20">
	<!-- Header Area -->
	<div
		class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-xl sticky top-0 z-30"
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
					New Song Entry
				</h1>
				<p
					class="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]"
				>
					Initialize Song Metadata
				</p>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<button
				onclick={() => goto("/songs")}
				class="px-5 py-2.5 text-slate-400 hover:text-white font-bold text-sm transition-all"
			>
				Cancel
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
					Creating...
				{:else}
					<Plus class="w-4 h-4" />
					Create Song
				{/if}
			</button>
		</div>
	</div>

	<div class="flex flex-col lg:flex-row gap-8">
		<!-- Sidebar Navigation -->
		<div class="lg:w-64 flex-shrink-0">
			<nav class="space-y-1 sticky top-32">
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
		<div class="flex-1 space-y-8">
			{#if activeTab === "general"}
				<section
					class="bg-slate-900/40 rounded-3xl border border-slate-800 p-8 space-y-8"
				>
					<div
						class="p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 space-y-4"
					>
						<div class="space-y-2">
							<label
								class="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1"
								>Map Name (Permanent Identifier)</label
							>
							<input
								bind:value={song.mapName}
								type="text"
								placeholder="e.g. Toxic"
								class="w-full bg-slate-950 border border-indigo-500/30 rounded-2xl px-5 py-3.5 text-white outline-none focus:border-indigo-500 transition-all font-mono"
							/>
							<p class="text-[10px] text-slate-500 ml-1">
								The mapName is used for file system paths and
								cannot be changed easily later.
							</p>
						</div>
					</div>

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
							<input
								bind:value={song.originalJDVersion}
								type="number"
								class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white outline-none focus:border-indigo-500 transition-all font-medium"
							/>
						</div>
						<div class="space-y-2">
							<label
								class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1"
								>Release Date</label
							>
							<input
								bind:value={song.releaseDate}
								type="text"
								placeholder="YYYY-MM-DD"
								class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white outline-none focus:border-indigo-500 transition-all font-medium"
							/>
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

					<div class="space-y-4">
						<label
							class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1"
							>Tags</label
						>
						<div class="flex flex-wrap items-center gap-2">
							{#each song.tags || [] as tagId, i}
								{@const tag = availableTags.find((t) => t._id === tagId)}
								<div
									class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold shadow-sm"
									style="background-color: {tag?.color
										? tag.color + '20'
										: 'rgba(79, 70, 229, 0.1)'}; color: {tag?.color ||
										'#818cf8'}; border-color: {tag?.color
										? tag.color + '40'
										: 'rgba(79, 70, 229, 0.2)'};"
								>
									{tag?.name || "Loading..."}
									<button
										onclick={() => song.tags.splice(i, 1)}
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
								<h2 class="text-base font-black text-white">Add Tags</h2>
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
												song.tags = [...(song.tags || []), t._id];
												tagSearchQuery = "";
											}}
											class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-all text-left group"
										>
											<div
												class="w-3 h-3 rounded-full shadow-sm"
												style="background-color: {t.color || '#4f46e5'}"
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
										<div class="text-center py-8 text-slate-500 text-sm">
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
								<div class="flex items-center justify-between">
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
													(song.coachCount = count)}
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
								<div class="flex items-center justify-between">
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
											<option value={i}>{label}</option>
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
											bind:value={song.sweatDifficulty}
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
				</section>
			{:else}
				<div
					class="bg-slate-900/40 rounded-3xl border border-slate-800 p-20 text-center"
				>
					<p class="text-slate-400 text-sm">
						Please finish the General Info and Core Stats first.<br
						/>Additional sections (Visuals, Assets, Raw) are
						available after the initial creation.
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>

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
</style>
