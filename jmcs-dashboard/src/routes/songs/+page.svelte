<script lang="ts">
	import { fetchApi } from "$lib/api";
	import { onMount } from "svelte";
	import {
		Edit2,
		Trash2,
		Search,
		Plus,
		Music,
		RefreshCw,
		Download,
		CheckCircle,
		AlertCircle,
		X,
		ChevronDown,
		ChevronUp,
	} from "lucide-svelte";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import { refreshTrigger } from "$lib/jmcs";
	import { getSongThumbnail } from "$lib/utils";
	import PageHeader from "$lib/components/PageHeader.svelte";
	import { toast } from "$lib/toast";

	const SONG_ENUMS = {
		coachCount: { NA: 0, Solo: 1, Duo: 2, Trio: 3, Quatuor: 4 },
		difficulty: { NA: 0, Easy: 1, Normal: 2, Hard: 3, Extreme: 4 },
		mode: {
			Classic: 0,
			Mashup: 1,
			PartyMaster: 2,
			Sweat: 3,
			Battle: 4,
			OnStage: 5,
			Max: 6,
		},
		status: { Unavailable: 0, Hidden: 1, Locked: 2, Available: 3 },
	};

	let songs: any[] = $state([]);
	let loading = $state(true);
	let isStale = $state(false);
	let total = $state(0);
	let errorMessage = $state("");
	let searchQuery = $state("");
	let activeTagFilter = $state("");
	let activeStatusFilter = $state("");
	let activePatreonFilter = $state("");
	let showModal = $state(false);
	let currentSong: any = $state(null);
	let saving = $state(false);
	let currentPage = $state(1);
	let jdVersionOverrides: Record<string, string> = $state({});

	// Bulk selection
	let selectedSongs = $state(new Set<string>());
	let selectAll = $state(false);
	let bulkActionRunning = $state(false);
	let bulkScheduleDate = $state(new Date().toISOString().split('T')[0]);

	// Migration state
	let migrating = $state(false);
	let migrateLog: Array<{ mapName: string; action: string; error?: string }> =
		$state([]);
	let migrateSummary: {
		imported: number;
		updated: number;
		skipped: number;
		errors: number;
	} | null = $state(null);
	let migrateFatalError = $state("");
	let showMigrateModal = $state(false);
	const perPage = 50;

	onMount(async () => {
		const searchParam = $page.url.searchParams.get("search");
		const mapNameParam = $page.url.searchParams.get("mapName");
		const tagParam = $page.url.searchParams.get("tag");
		const statusParam = $page.url.searchParams.get("status");
		const patreonParam = $page.url.searchParams.get("patreon");

		if (tagParam) activeTagFilter = tagParam;
		if (statusParam) activeStatusFilter = statusParam;
		if (patreonParam) activePatreonFilter = patreonParam;

		if (searchParam) {
			searchQuery = searchParam;
			await load();
		} else if (mapNameParam) {
			await load(false, mapNameParam);
			if (songs.length === 1 && songs[0].mapName === mapNameParam) {
				openEdit(songs[0]);
			}
		} else {
			await load();
		}

		// Also load constants for JD Version friendly names
		try {
			const constantsRes = await fetchApi<any>("/constant-provider/v1/sku-constants");
			if (constantsRes?.JDVersion?.Override) {
				jdVersionOverrides = constantsRes.JDVersion.Override;
			}
		} catch (e) {
			// Ignore if fails
		}
	});

	$effect(() => {
		if ($refreshTrigger) load();
	});

	// Trigger load when page or search changes
	$effect(() => {
		currentPage;
		load();
	});

	let searchTimeout: any;
	$effect(() => {
		searchQuery;
		activeTagFilter;
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			currentPage = 1;
			selectedSongs = new Set();
			selectAll = false;
			load();
		}, 300);
	});

	// Immediate reload on filter changes (no debounce)
	$effect(() => {
		activeStatusFilter;
		activePatreonFilter;
		currentPage = 1;
		selectedSongs = new Set();
		selectAll = false;
		load();
	});

	async function load(quiet = false, mapNameOverride?: string) {
		try {
			if (!quiet) loading = true;
			isStale = true;
			errorMessage = "";

			const q = new URLSearchParams({
				page: currentPage.toString(),
				limit: perPage.toString(),
				search: searchQuery,
			});
			if (activeTagFilter) q.set("tag", activeTagFilter);
			if (activeStatusFilter) q.set("status", activeStatusFilter);
			if (activePatreonFilter) q.set("patreon", activePatreonFilter);
			if (mapNameOverride) q.set("mapName", mapNameOverride);

			const res = await fetchApi<{ items: any[]; total: number }>(
				`manage-songs/list?${q.toString()}`,
			);
			songs = res.items || [];
			total = res.total || 0;
		} catch (e: any) {
			errorMessage = e.message || "Failed to connect to the server.";
			songs = [];
		} finally {
			loading = false;
			isStale = false;
		}
	}

	// ─── Bulk Actions ──────────────────────────────────────────────

	async function bulkAction(action: string, value?: any) {
		bulkActionRunning = true;
		try {
			if (selectAll) {
				// Apply to ALL songs matching the current filter
				const body: Record<string, any> = { action };
				if (value !== undefined) body.value = value;
				if (searchQuery) body.search = searchQuery;
				if (activeTagFilter) body.tag = activeTagFilter;
				if (activeStatusFilter) body.status = activeStatusFilter;
				if (activePatreonFilter) body.patreon = activePatreonFilter;

				const res = await fetchApi<any>("manage-songs/bulk-by-filter", {
					method: "POST",
					body: JSON.stringify(body),
				});
				const labels: Record<string, string> = {
					publish: "published",
					unpublish: "unpublished",
					"set-patreon": value ? "marked as Patreon" : "unmarked as Patreon",
				};
				toast.success(`${res.count} songs ${labels[action] || action}`);
			} else {
				const mapNames = Array.from(selectedSongs);
				if (mapNames.length === 0) return;
				await fetchApi("manage-songs/bulk", {
					method: "POST",
					body: JSON.stringify({ action, mapNames, value }),
				});
				const labels: Record<string, string> = {
					publish: "published",
					unpublish: "unpublished",
					"set-patreon": value ? "marked as Patreon" : "unmarked as Patreon",
				};
				toast.success(`${mapNames.length} songs ${labels[action] || action}`);
			}
			selectedSongs = new Set();
			selectAll = false;
			await load();
		} catch (e: any) {
			toast.error("Bulk action failed: " + e.message);
		} finally {
			bulkActionRunning = false;
		}
	}

	function toggleSelectAll() {
		selectAll = !selectAll;
		if (!selectAll) {
			selectedSongs = new Set();
		}
	}

	function toggleSong(mapName: string) {
		if (selectAll) {
			// Switching from "all" mode to individual — start with all current songs selected except this one
			selectAll = false;
			selectedSongs = new Set(songs.map((s) => s.mapName));
			selectedSongs.delete(mapName);
		} else {
			const next = new Set(selectedSongs);
			if (next.has(mapName)) {
				next.delete(mapName);
			} else {
				next.add(mapName);
			}
			selectedSongs = next;
			selectAll = next.size === songs.length;
		}
	}

	const statusOptions = [
		{ value: "", label: "All" },
		{ value: "published", label: "Published" },
		{ value: "unpublished", label: "Unpublished" },
	];

	const patreonOptions = [
		{ value: "", label: "All" },
		{ value: "true", label: "Patreon Only" },
		{ value: "false", label: "Non-Patreon" },
	];

	let maxPage = $derived(Math.max(1, Math.ceil(total / perPage)));

	function openCreate() {
		goto("/songs/new");
	}
	function openEdit(song: any) {
		goto(`/songs/${song.mapName}`);
	}

	async function deleteSong(mapName: string) {
		if (!confirm(`Are you sure you want to delete ${mapName}?`)) return;
		await fetchApi(`manage-songs/delete/${mapName}`, { method: "DELETE" });
		await load();
	}

	async function startMigration() {
		migrating = true;
		migrateLog = [];
		migrateSummary = null;
		migrateFatalError = "";

		try {
			// The user said: "all u have to do is fetchApi<any>("manage-songs/migrate"); with POST"
			// This will wait for the entire stream to finish and return it as text since it's text/event-stream.
			const res = await fetchApi<any>("manage-songs/migrate", {
				method: "POST",
			});

			// If it returned a summary object (maybe backend was updated?)
			if (res?.summary) {
				migrateSummary = res.summary;
			} else if (typeof res === "string") {
				// Parse SSE stream text for the final summary event
				const lines = res.split("\n\n");
				for (const line of lines.reverse()) {
					if (line.startsWith("data: ")) {
						const payload = JSON.parse(line.substring(6));
						if (payload.summary) {
							migrateSummary = payload.summary;
							break;
						}
					}
				}
			}

			if (migrateSummary) {
				toast.success("Migration complete!");
			} else {
				// If no summary found, maybe it failed
				migrateFatalError = "Migration finished without a summary.";
			}
			load();
		} catch (e: any) {
			migrateFatalError = e.message || "Migration failed.";
			toast.error("Migration failed: " + e.message);
		} finally {
			migrating = false;
		}
	}

	function handleOpenMigrate() {
		migrateLog = [];
		migrateSummary = null;
		migrateFatalError = "";
		showMigrateModal = true;
		startMigration();
	}

	function closeMigrateModal() {
		if (migrating) {
			if (!confirm("Migration is still running. Close anyway?")) return;
		}
		showMigrateModal = false;
	}

	const statusColors: Record<number, string> = {
		0: "bg-slate-700 text-slate-300",
		1: "bg-yellow-500/20 text-yellow-400",
		2: "bg-orange-500/20 text-orange-400",
		3: "bg-green-500/20 text-green-400",
	};
	const statusLabels: Record<number, string> = {
		0: "Unavailable",
		1: "Hidden",
		2: "Locked",
		3: "Available",
	};
</script>

<div class="max-w-[1600px] mx-auto space-y-8 pb-12">
	<!-- Header Section -->
	<PageHeader
		title="Song Library"
		description="Manage your game's tracklist, metadata, and asset mappings."
		icon={Music}
	>
		{#snippet children()}
			<div
				class="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-2 w-80 focus-within:border-indigo-500/50 transition-all backdrop-blur-md"
			>
				<Search class="w-4 h-4 text-slate-500" />
				<input
					bind:value={searchQuery}
					type="text"
					placeholder="Search title, artist or map..."
					class="bg-transparent text-sm text-white outline-none w-full placeholder-slate-600"
				/>
			</div>

			{#if activeTagFilter}
				<div
					class="flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-3 py-2 rounded-2xl text-xs font-bold border border-indigo-500/20"
				>
					Tag Filter
					<button
						class="hover:text-white"
						onclick={() => (activeTagFilter = "")}
					>
						&times;
					</button>
				</div>
			{/if}
		{/snippet}

		{#snippet actions()}
			<!-- had to remove it cuz of dumbass mitch
			<button
				onclick={handleOpenMigrate}
				disabled={migrating}
				class="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50"
			>
				<Download class="w-4 h-4" /> Migrate from old server
			</button> -->
			<button
				onclick={openCreate}
				class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
			>
				<Plus class="w-4 h-4" /> Add Song
			</button>
		{/snippet}
	</PageHeader>

	<!-- Unified Toolbar: filters + select + bulk actions -->
	<div
		class="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden"
	>
		<!-- Top row: filters + select-all -->
		<div class="flex flex-wrap items-center gap-4 p-4">
			<!-- Status Filter -->
			<div class="flex items-center gap-2">
				<span
					class="text-[10px] font-black text-slate-500 uppercase tracking-widest"
					>Status</span
				>
				<div class="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
					{#each statusOptions as opt}
						<button
							onclick={() => (activeStatusFilter = opt.value)}
							class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all {activeStatusFilter ===
							opt.value
								? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
								: 'text-slate-500 hover:text-slate-300'}"
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Patreon Filter -->
			<div class="flex items-center gap-2">
				<span
					class="text-[10px] font-black text-slate-500 uppercase tracking-widest"
					>Patreon</span
				>
				<div class="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
					{#each patreonOptions as opt}
						<button
							onclick={() => (activePatreonFilter = opt.value)}
							class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all {activePatreonFilter ===
							opt.value
								? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
								: 'text-slate-500 hover:text-slate-300'}"
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			{#if activeTagFilter}
				<div class="flex items-center gap-2">
					<span
						class="text-[10px] font-black text-slate-500 uppercase tracking-widest"
						>Tag</span
					>
					<div
						class="flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-xl text-xs font-bold border border-indigo-500/20"
					>
						{activeTagFilter}
						<button
							class="hover:text-white"
							onclick={() => (activeTagFilter = "")}
						>
							&times;
						</button>
					</div>
				</div>
			{/if}

			<div class="flex-1"></div>

			<!-- Select all checkbox -->
			<label class="flex items-center gap-2 cursor-pointer select-none shrink-0">
				<input
					type="checkbox"
					checked={selectAll}
					onchange={toggleSelectAll}
					class="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
				/>
				<span class="text-xs font-bold {selectAll ? 'text-indigo-400' : 'text-slate-500'}">
					{selectAll ? `All ${total} selected` : 'Select all'}
				</span>
			</label>
		</div>

		<!-- Bottom row: bulk actions (only when something is selected) -->
		{#if selectAll || selectedSongs.size > 0}
			<div
				class="flex items-center gap-3 px-4 py-3 bg-indigo-600/5 border-t border-indigo-500/20"
			>
				<span class="text-sm font-bold text-indigo-400 shrink-0">
					{selectAll
						? `All ${total} songs`
						: `${selectedSongs.size} song${selectedSongs.size > 1 ? 's' : ''}`}
				</span>
				<div class="w-px h-5 bg-indigo-500/20"></div>
				<button
					onclick={() => bulkAction("publish")}
					disabled={bulkActionRunning}
					class="px-3 py-1.5 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
				>
					Publish
				</button>
				<button
					onclick={() => bulkAction("unpublish")}
					disabled={bulkActionRunning}
					class="px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
				>
					Unpublish
				</button>
				<div class="w-px h-5 bg-indigo-500/20"></div>
				<button
					onclick={() => bulkAction("set-patreon", true)}
					disabled={bulkActionRunning}
					class="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
				>
					Mark Patreon
				</button>
				<button
					onclick={() => bulkAction("set-patreon", false)}
					disabled={bulkActionRunning}
					class="px-3 py-1.5 bg-slate-600/20 hover:bg-slate-600 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
				>
					Unmark Patreon
				</button>
				<div class="w-px h-5 bg-indigo-500/20"></div>
				<input
					type="date"
					bind:value={bulkScheduleDate}
					class="w-36 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-indigo-500 appearance-none"
				/>
				<button
					onclick={() => bulkAction("schedule", new Date(bulkScheduleDate + 'T00:00:00.000Z').toISOString())}
					disabled={bulkActionRunning}
					class="px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
				>
					Schedule
				</button>
				<div class="flex-1"></div>
				<button
					onclick={() => {
						selectedSongs = new Set();
						selectAll = false;
					}}
					class="text-xs text-slate-500 hover:text-white font-bold transition-all"
				>
					Clear
				</button>
			</div>
		{/if}
	</div>

	{#if loading && songs.length === 0}
		<div
			class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
		>
			{#each Array(8) as _}
				<div
					class="h-64 bg-slate-900/40 animate-pulse rounded-3xl border border-slate-800"
				></div>
			{/each}
		</div>
	{:else if errorMessage}
		<div
			class="bg-red-500/5 border border-red-500/20 rounded-3xl p-12 text-center"
		>
			<Trash2 class="w-12 h-12 text-red-500/50 mx-auto mb-4" />
			<h3 class="text-white font-bold text-lg">Failed to load songs</h3>
			<p class="text-slate-500 text-sm mt-1">{errorMessage}</p>
			<button
				onclick={load}
				class="mt-6 bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all"
			>
				Try Again
			</button>
		</div>
	{:else}
		<div
			class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
		>
			{#each songs as song (song.mapName)}
				{@const thumb = getSongThumbnail(song)}
				{@const rd = song.releaseDate}
				{@const isScheduled = typeof rd === 'string' && rd.length > 0 && new Date(rd) > new Date()}
				{@const isUnpublished = !rd}
				{@const isSelected = selectedSongs.has(song.mapName)}
				<div
					class="group relative bg-slate-900/40 border rounded-3xl overflow-hidden transition-all text-left backdrop-blur-sm shadow-xl {isSelected
						? 'border-indigo-500 ring-2 ring-indigo-500/30'
						: 'border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/40 hover:shadow-indigo-500/5'}"
				>
					<!-- Clickable area (opens edit) -->
					<button
						onclick={() => openEdit(song)}
						class="w-full text-left"
					>
						<div
							class="aspect-[16/9] w-full relative overflow-hidden bg-slate-950"
						>
							{#if thumb}
								<img
									src={thumb}
									class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
									alt=""
								/>
							{:else}
								<div
									class="w-full h-full flex items-center justify-center"
								>
									<Music class="w-12 h-12 text-slate-800" />
								</div>
							{/if}

							<!-- Status badge top-left -->
							<div class="absolute top-3 left-3 flex gap-2">
								{#if isScheduled}
									<span
										class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-amber-500/80 text-black"
									>
										Scheduled
									</span>
								{:else if isUnpublished}
									<span
										class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-600/80 text-slate-300"
									>
										Unpublished
									</span>
								{:else}
									<span
										class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-green-500/80 text-black"
									>
										Published
									</span>
								{/if}
								{#if song.isPatreon}
									<span
										class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-purple-500/80 text-white"
									>
										Patreon
									</span>
								{/if}
							</div>

							<div
								class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"
							></div>
						</div>

						<div class="p-6 space-y-4">
							<div class="space-y-1">
								<h3
									class="text-white font-black text-lg truncate group-hover:text-indigo-400 transition-colors"
								>
									{song.title || "Untitled Track"}
								</h3>
								<p
									class="text-slate-400 text-sm font-medium truncate"
								>
									{song.artist || "Unknown Artist"}
								</p>
							</div>

							<div
								class="flex items-center justify-between pt-2 border-t border-slate-800/50 gap-4"
							>
								<div class="flex flex-col min-w-0">
									<span
										class="text-[9px] font-black text-slate-600 uppercase tracking-widest shrink-0"
										>Map Name</span
									>
									<span class="text-xs font-mono text-slate-400 truncate"
										>{song.mapName}</span
									>
								</div>
								<div class="flex flex-col items-end min-w-0 shrink-0 max-w-[50%]">
									<span
										class="text-[9px] font-black text-slate-600 uppercase tracking-widest shrink-0"
										>Version</span
									>
									<span class="text-xs font-bold text-slate-400 truncate w-full text-right" title={jdVersionOverrides[song.originalJDVersion] ? `Just Dance ${jdVersionOverrides[song.originalJDVersion]}` : `JD ${song.originalJDVersion}`}>
										{#if jdVersionOverrides[song.originalJDVersion]}
											Just Dance {jdVersionOverrides[song.originalJDVersion]}
										{:else}
											JD {song.originalJDVersion}
										{/if}
									</span>
								</div>
							</div>
						</div>
					</button>

					<!-- Selection checkbox pinned bottom-right -->
					<div
						class="absolute top-3 right-3 z-10"
						onclick={(e) => e.stopPropagation()}
					>
						<input
							type="checkbox"
							checked={isSelected}
							onchange={() => toggleSong(song.mapName)}
							class="w-5 h-5 rounded-lg accent-indigo-600 cursor-pointer"
						/>
					</div>
				</div>
			{/each}
		</div>

		<div
			class="flex items-center justify-between mt-12 bg-slate-900/20 p-4 rounded-2xl border border-slate-800/50"
		>
			<div
				class="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2"
			>
				Page <span class="text-white">{currentPage}</span> of
				<span class="text-white">{maxPage}</span>
				<span class="mx-3 text-slate-800">|</span>
				Total <span class="text-white">{total}</span> Tracks
			</div>

			<div class="flex gap-2">
				<button
					disabled={currentPage === 1}
					onclick={() => {
						currentPage--;
						window.scrollTo({ top: 0, behavior: "smooth" });
					}}
					class="px-5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-black text-slate-300 disabled:opacity-20 transition-all hover:bg-slate-700 hover:text-white"
				>
					Previous
				</button>
				<button
					disabled={currentPage === maxPage}
					onclick={() => {
						currentPage++;
						window.scrollTo({ top: 0, behavior: "smooth" });
					}}
					class="px-5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-black text-slate-300 disabled:opacity-20 transition-all hover:bg-slate-700 hover:text-white"
				>
					Next
				</button>
			</div>
		</div>
	{/if}
</div>

{#if showMigrateModal}
	<div
		class="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
	>
		<div
			class="bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
		>
			<!-- Header -->
			<div class="p-8 border-b border-slate-800 flex items-center justify-between">
				<div class="flex items-center gap-4">
					{#if migrating}
						<div class="relative">
							<RefreshCw class="w-8 h-8 text-indigo-500 animate-spin" />
							<div class="absolute inset-0 bg-indigo-500 blur-lg opacity-20"></div>
						</div>
						<div>
							<h3 class="text-xl font-black text-white">Migrating...</h3>
							<p class="text-slate-500 text-sm font-medium">Pulling songs from legacy database</p>
						</div>
					{:else if migrateFatalError}
						<AlertCircle class="w-8 h-8 text-red-500" />
						<div>
							<h3 class="text-xl font-black text-white">Migration Failed</h3>
							<p class="text-red-400 text-sm font-medium">{migrateFatalError}</p>
						</div>
					{:else if migrateSummary}
						<CheckCircle class="w-8 h-8 text-green-500" />
						<div>
							<h3 class="text-xl font-black text-white">Migration Complete</h3>
							<p class="text-slate-500 text-sm font-medium">Song database is up to date</p>
						</div>
					{/if}
				</div>
				<button
					onclick={closeMigrateModal}
					class="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-all"
				>
					<X class="w-6 h-6" />
				</button>
			</div>

			<!-- Status Area -->
			<div class="flex-1 flex flex-col items-center justify-center p-12 text-center">
				{#if migrating}
					<div class="relative mb-8">
						<RefreshCw class="w-20 h-20 text-indigo-500 animate-spin" />
						<div class="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse"></div>
					</div>
					<h3 class="text-2xl font-black text-white mb-2">Migration in Progress</h3>
					<p class="text-slate-500 max-w-sm mx-auto">Please wait while we sync the song database. This can take up to 2 minutes.</p>
				{:else if migrateFatalError}
					<div class="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-8">
						<AlertCircle class="w-10 h-10" />
					</div>
					<h3 class="text-2xl font-black text-white mb-2">Migration Failed</h3>
					<p class="text-red-400 max-w-sm mx-auto mb-8">{migrateFatalError}</p>
				{:else if migrateSummary}
					<div class="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-8">
						<CheckCircle class="w-10 h-10" />
					</div>
					<h3 class="text-2xl font-black text-white mb-2">Success!</h3>
					<p class="text-slate-500 max-w-sm mx-auto mb-8">Song database has been successfully updated.</p>
				{/if}
			</div>

			<!-- Summary -->
			{#if migrateSummary}
				<div class="p-8 bg-slate-900 border-t border-slate-800">
					<div class="grid grid-cols-4 gap-4">
						<div class="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
							<span class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Imported</span>
							<span class="text-2xl font-black text-green-500">{migrateSummary.imported}</span>
						</div>
						<div class="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
							<span class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Updated</span>
							<span class="text-2xl font-black text-blue-500">{migrateSummary.updated}</span>
						</div>
						<div class="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
							<span class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Skipped</span>
							<span class="text-2xl font-black text-slate-400">{migrateSummary.skipped}</span>
						</div>
						<div class="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
							<span class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Errors</span>
							<span class="text-2xl font-black text-red-500">{migrateSummary.errors}</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- Footer -->
			<div class="p-8 bg-slate-900/50 border-t border-slate-800 flex justify-end gap-3">
				<button
					onclick={closeMigrateModal}
					class="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all"
				>
					Close
				</button>
				{#if !migrating && (migrateSummary || migrateFatalError)}
					<button
						onclick={startMigration}
						class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
					>
						Run again
					</button>
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
</style>
