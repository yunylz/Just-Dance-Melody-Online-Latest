<script lang="ts">
	import { fetchApi } from "$lib/api";
	import { onMount } from "svelte";
	import { dndzone } from "svelte-dnd-action";
	import { flip } from "svelte/animate";
	import {
		Plus,
		Trash2,
		ChevronDown,
		ChevronRight,
		Send,
		Filter,
		Layers,
		Zap,
		Music,
		Search,
		Copy,
		GripVertical,
		AlertCircle,
		Download,
		Upload,
		FileJson,
	} from "lucide-svelte";
	import JsonEditor from "$lib/components/JsonEditor.svelte";

	interface OfflineRequest {
		__class: string;
		mapName?: string;
		itemList?: string;
		actionListName?: string;
		actionListNameUpsell?: string;
		[key: string]: any;
	}
	interface Component {
		__class: string;
		[key: string]: any;
	}
	interface Item {
		__class: string;
		act?: string;
		isc?: string;
		actionList?: string;
		offlineRequest?: OfflineRequest;
		components?: Component[];
		filters?: any[];
		[key: string]: any;
	}
	interface Category {
		id?: string;
		title?: string;
		titleId?: number;
		act: string;
		isc: string;
		order?: any;
		logoUrl?: string;
		noItemsMsg?: string;
		categoryType?: string;
		items: Item[];
		requests: any[];
		filters?: any[];
	}
	interface PageRule {
		pageName: string;
		onlineOnly: boolean;
		categories: Category[];
		_id?: string;
	}

	const OFFLINE_REQUEST_CLASSES = [
		"JD_CarouselMapRequest",
		"JD_CarouselItemRequest",
		"JD_CarouselPlaylistRequest",
		"JD_CarouselQuestRequest",
		"JD_CarouselDMEpisodeRequest",
	];

	const REQUEST_CLASSES = [
		"JD_CarouselSmartSongRequestDesc",
		"JD_CarouselTopPlayedRequestDesc",
		"JD_CarouselAutoRecommendationRequestDesc",
		"JD_CarouselMapRequestDesc",
		"JD_CarouselItemRequestDesc",
		"JD_CarouselPlaylistMapRequestDesc",
	];

	const COMPONENT_CLASSES = [
		"JD_CarouselContentComponent_Song",
		"JD_CarouselContentComponent_Shuffle",
		"JD_CarouselContentComponent_SearchPreset",
		"JD_CarouselContentComponent_Playlist",
		"JD_CarouselContentComponent_Quest",
	];

	const FILTER_CLASSES = [
		"JD_CarouselTimeFilter",
		"JD_CarouselCountryFilter",
		"JD_CarouselSubscriptionFilter",
		"JD_CarouselUserFilter",
		"JD_CarouselSkuFilter",
		"JD_CarouselTrueFilter",
	];

	import { getSongThumbnail } from "$lib/utils";

	// --- State ---
	let pages: PageRule[] = $state([]);
	let searchQuery = $state("");
	let filteredPages = $derived(
		searchQuery
			? pages.filter((p) =>
					p.pageName
						.toLowerCase()
						.includes(searchQuery.toLowerCase()),
				)
			: pages,
	);
	let itemListNames: string[] = $state([]);
	let actionListNames: string[] = $state([]);
	let songs: any[] = $state([]);
	let loading = $state(true);
	let selectedPage: PageRule | null = $state(null);
	let expandedCategories: Set<string> = $state(new Set());
	let expandedItems: Record<string, Set<string>> = $state({}); // catId -> set of itemId
	let saving = $state(false);
	let publishing = $state(false);
	let isDirty = $state(false);
	let jsonErrors: Set<string> = $state(new Set());
	let hasJsonErrors = $derived(jsonErrors.size > 0);

	function updateJsonError(id: string, isValid: boolean) {
		if (isValid) jsonErrors.delete(id);
		else jsonErrors.add(id);
		jsonErrors = new Set(jsonErrors);
	}
	let showNewPageModal = $state(false);
	let newPageName = $state("");
	let songSearchQuery = $state("");
	let activePickerComp: any = $state(null);

	let showImportModal = $state(false);
	let importJsonText = $state("");

	onMount(async () => {
		await Promise.all([
			loadPages(),
			loadItemLists(),
			loadActionLists(),
			loadSongs(),
		]);
	});

	async function loadPages() {
		loading = true;
		const res = await fetchApi<{ items: any[] }>(
			"manage-carousel/listRules",
		);
		pages = res.items || [];
		loading = false;
	}
	async function loadItemLists() {
		const res = await fetchApi<{ items: any[] }>(
			"manage-carousel/listItemLists",
		);
		itemListNames = (res.items || [])
			.map((i: any) => i.name)
			.sort((a: string, b: string) => a.localeCompare(b));
	}
	async function loadActionLists() {
		const res = await fetchApi<{ items: any[] }>(
			"manage-carousel/listActionLists",
		);
		actionListNames = (res.items || [])
			.map((i: any) => i.name)
			.sort((a: string, b: string) => a.localeCompare(b));
	}
	async function loadSongs() {
		const res = await fetchApi<{ items: any[] }>("manage-songs/list");
		songs = res.items || [];
	}

	async function selectPage(page: PageRule) {
		if (isDirty && !confirm("Discard unsaved changes?")) return;
		loading = true;
		const res = await fetchApi<{ item: PageRule }>(
			`manage-carousel/getRule/${encodeURIComponent(page.pageName)}`,
		);
		selectedPage = res.item || JSON.parse(JSON.stringify(page));
		if (!selectedPage.categories) selectedPage.categories = [];
		for (const cat of selectedPage.categories) {
			if (!cat.items) cat.items = [];
			if (!cat.requests) cat.requests = [];
			if (!cat.filters) cat.filters = [];
			for (const item of cat.items) {
				if (!item.filters) item.filters = [];
			}
		}
		selectedPage.categories = ensureIds(selectedPage.categories);
		expandedCategories = new Set();
		expandedItems = {};
		loading = false;
		isDirty = false;
	}

	function ensureIds(categories: Category[]) {
		const genId = () => Math.random().toString(36).substring(2, 9);
		return categories.map((cat) => {
			const newCat = {
				...cat,
				id: cat.id || genId(),
			};
			if (newCat.requests) {
				newCat.requests = newCat.requests.map((req: any) => ({
					...req,
					id: req.id || genId(),
				}));
			}
			if (newCat.filters) {
				newCat.filters = newCat.filters.map((f: any) => ({
					...f,
					id: f.id || genId(),
				}));
			}
			if (newCat.items) {
				newCat.items = newCat.items.map((item: any) => {
					const newItem = {
						...item,
						id: item.id || genId(),
					};
					if (newItem.filters) {
						newItem.filters = newItem.filters.map((f: any) => ({
							...f,
							id: f.id || genId(),
						}));
					}
					if (newItem.components) {
						newItem.components = newItem.components.map(
							(c: any) => ({
								...c,
								id: c.id || genId(),
							}),
						);
					}
					return newItem;
				});
			}
			return newCat;
		});
	}

	function markDirty() {
		if (loading) return;
		isDirty = true;
	}

	// Category ops
	function addCategory() {
		if (!selectedPage) return;
		selectedPage.categories.push({
			id: Math.random().toString(36).substring(2, 9),
			title: "New Category",
			act: "ui_carousel",
			isc: "grp_row",
			items: [],
			requests: [],
			filters: [],
		});
		expandedCategories.add(selectedPage.categories.length - 1);
		markDirty();
	}

	function removeCategory(idx: number) {
		if (!selectedPage || !confirm("Remove this category?")) return;
		selectedPage.categories.splice(idx, 1);
		markDirty();
	}

	function duplicateCategory(idx: number) {
		if (!selectedPage) return;
		const original = selectedPage.categories[idx];
		const copy = JSON.parse(JSON.stringify(original));
		// New ID for the copy
		copy.id = Math.random().toString(36).substring(2, 9);
		if (copy.title) copy.title = copy.title + " (Copy)";
		selectedPage.categories.splice(idx + 1, 0, copy);
		markDirty();
	}

	function handleDndConsider(e: CustomEvent<any>) {
		if (!selectedPage) return;
		selectedPage.categories = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<any>) {
		if (!selectedPage) return;
		selectedPage.categories = e.detail.items;
		markDirty();
	}

	function toggleCategory(id: string) {
		if (expandedCategories.has(id)) expandedCategories.delete(id);
		else expandedCategories.add(id);
		expandedCategories = new Set(expandedCategories);
	}

	function toggleItem(catId: string, itemId: string) {
		if (!expandedItems[catId]) expandedItems[catId] = new Set();
		if (expandedItems[catId].has(itemId))
			expandedItems[catId].delete(itemId);
		else expandedItems[catId].add(itemId);
		expandedItems[catId] = new Set(expandedItems[catId]); // trigger reactivity
	}

	// Item ops
	function addItem(cat: Category) {
		cat.items.push({
			__class: "Item",
			id: Math.random().toString(36).substring(2, 9),
			filters: [],
		});
		markDirty();
	}

	function removeItem(cat: Category, idx: number) {
		cat.items.splice(idx, 1);
		markDirty();
	}

	// Request ops
	function addRequest(cat: Category, className: string) {
		if (!cat.requests) cat.requests = [];
		const req: any = {
			__class: className,
			id: Math.random().toString(36).substring(2, 9),
		};
		if (className === "JD_CarouselSmartSongRequestDesc") {
			req.filters = {};
			req.maxCount = 24;
			req.actionListName = "playMap";
		}
		cat.requests.push(req);
		markDirty();
	}

	function removeRequest(cat: Category, idx: number) {
		if (!cat.requests) return;
		cat.requests.splice(idx, 1);
		markDirty();
	}

	// Offline Request ops
	function setOfflineRequest(item: Item, className: string) {
		item.offlineRequest = { __class: className };
		if (className === "JD_CarouselMapRequest")
			item.offlineRequest.mapName = "";
		if (className === "JD_CarouselItemRequest")
			item.offlineRequest.itemList = "";
		markDirty();
	}

	function removeOfflineRequest(item: Item) {
		delete item.offlineRequest;
		markDirty();
	}

	// Component ops
	function addComponent(item: Item, className: string) {
		if (!item.components) item.components = [];
		item.components.push({
			__class: className,
			id: Math.random().toString(36).substring(2, 9),
		});
		markDirty();
	}

	function removeComponent(item: Item, idx: number) {
		if (!item.components) return;
		item.components.splice(idx, 1);
		if (item.components.length === 0) delete item.components;
		markDirty();
	}

	// Filter ops
	function addFilter(target: { filters?: any[] }, className: string) {
		if (!target.filters) target.filters = [];
		const filter: any = {
			__class: className,
			id: Math.random().toString(36).substring(2, 9),
		};
		if (className === "JD_CarouselTimeFilter") {
			filter.local = false;
		} else if (className === "JD_CarouselCountryFilter") {
			filter.groups = [];
			filter.countries = [];
			filter.reversed = false;
		}
		target.filters.push(filter);
		markDirty();
	}

	function removeFilter(target: { filters?: any[] }, idx: number) {
		if (!target.filters) return;
		target.filters.splice(idx, 1);
		markDirty();
	}

	function parseFilterArray(val: string) {
		return val
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
	}

	function updateJsonPayload(
		target: any,
		jsonString: string,
		preserveKeys: string[] = ["__class"],
	) {
		try {
			const parsed = JSON.parse(jsonString);
			Object.keys(target).forEach((k) => {
				if (!preserveKeys.includes(k)) delete target[k];
			});
			Object.assign(target, parsed);
			markDirty();
		} catch (e) {
			// ignore invalid JSON while typing
		}
	}

	// Save
	async function savePage() {
		if (!selectedPage) return;
		if (hasJsonErrors) {
			alert("Please fix JSON syntax errors before saving.");
			return;
		}
		saving = true;
		try {
			await fetchApi(
				`manage-carousel/updateRule/${encodeURIComponent(selectedPage.pageName)}`,
				{
					method: "PUT",
					body: JSON.stringify(selectedPage),
				},
			);
			isDirty = false;
			await loadPages();
		} catch (e: any) {
			alert("Save failed: " + e.message);
		} finally {
			saving = false;
		}
	}

	async function createPage() {
		let name = newPageName.trim();
		if (!name) return;
		if (name.startsWith("/")) name = name.substring(1);
		await fetchApi(
			"manage-carousel/updateRule/" + encodeURIComponent(name),
			{
				method: "PUT",
				body: JSON.stringify({
					pageName: name,
					onlineOnly: false,
					categories: [],
				}),
			},
		);
		showNewPageModal = false;
		newPageName = "";
		await loadPages();
	}

	async function deletePage(pageName: string) {
		if (!confirm(`Delete page "${pageName}"? This cannot be undone.`))
			return;
		await fetchApi(
			`manage-carousel/deleteRule/${encodeURIComponent(pageName)}`,
			{ method: "DELETE" },
		);
		if (selectedPage?.pageName === pageName) selectedPage = null;
		await loadPages();
	}

	async function publish() {
		if (hasJsonErrors) {
			alert("Please fix JSON syntax errors before publishing.");
			return;
		}
		if (isDirty) {
			if (!confirm("You have unsaved changes. Publish anyway?")) return;
		}
		publishing = true;
		try {
			await fetchApi("manage-carousel/publish", { method: "POST" });
			alert("Published to Redis successfully!");
		} catch (e: any) {
			alert("Publish failed: " + e.message);
		} finally {
			publishing = false;
		}
	}

	function shortClass(cls: string) {
		return cls
			.replace("JD_Carousel", "")
			.replace("Desc", "")
			.replace("Request", "Req")
			.replace("ContentComponent_", "");
	}

	const classColors: Record<string, string> = {
		JD_CarouselMapRequest:
			"bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
		JD_CarouselItemRequest:
			"bg-purple-500/20 text-purple-400 border-purple-500/30",
		JD_CarouselDMEpisodeRequest:
			"bg-slate-500/20 text-slate-400 border-slate-500/30",
		JD_CarouselPlaylistRequest:
			"bg-pink-500/20 text-pink-400 border-pink-500/30",
		JD_CarouselQuestRequest:
			"bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
	};

	const gameColors: Record<string, string> = {
		jd2016: "bg-blue-500/20 text-blue-400 border-blue-500/30",
		jd2017: "bg-amber-500/20 text-amber-400 border-amber-500/30",
		jd2018: "bg-pink-500/20 text-pink-400 border-pink-500/30",
		jd2019: "bg-orange-500/20 text-orange-400 border-orange-500/30",
		jd2020: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
		jd2021: "bg-violet-500/20 text-violet-400 border-violet-500/30",
		jd2022: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
		mca: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
	};

	const pageGameMap: Record<string, string[]> = {
		anthology: ["jd2020"],
		avatars: ["jd2016", "jd2017", "jd2018"],
		"avatars-creation": ["jd2016", "jd2017", "jd2018"],
		"community-remix": ["jd2016", "jd2017"],
		"create-challenge": ["jd2016", "jd2017"],
		"create-playlist": ["jd2016", "jd2017", "jd2018"],
		dancerprofile: ["jd2016", "jd2017", "jd2018", "jd2019"],
		"friend-dancerprofile": [
			"jd2016",
			"jd2017",
			"jd2018",
			"jd2019",
			"jd2020",
		],
		ftue: ["jd2018"],
		"jd2019-playlists": ["jd2019"],
		"jd2020-playlists": ["jd2020"],
		"jd2021-playlists": ["jd2021"],
		"jd2022-playlists": ["jd2022"],
		jdtv: ["jd2016", "jd2017", "jd2018", "jd2019", "jd2020", "jd2021"],
		"jdtv-companion-app": ["mca"],
		"jdtv-nx": ["jd2017", "jd2018", "jd2019", "jd2020", "jd2021"],
		kids: ["jd2018", "jd2019", "jd2020", "jd2021"],
		"kids-extended": ["jd2018", "jd2019", "jd2020", "jd2021"],
		"matches-friendly": ["jd2016", "jd2017"],
		party: ["jd2016", "jd2017", "jd2018"],
		partycoop: ["jd2016", "jd2017"],
		quests: ["jd2016", "jd2017"],
		"recap-autodance": ["jd2016", "jd2017", "jd2018"],
		"recap-showtime": ["jd2016"],
		"search-map": ["jd2017"],
		showtime: ["jd2016"],
		skins: ["jd2017", "jd2018"],
		"skins-creation": ["jd2017", "jd2018"],
		sweat: ["jd2016", "jd2017"],
		"upload-queue": ["jd2017", "jd2018", "jd2019", "jd2020", "jd2021"],
		"upsell-videos": ["jd2017", "jd2018", "jd2019", "jd2020", "jd2021"],
		"world-video-challenge": ["jd2016", "jd2018"],
	};

	function selectSongForComponent(comp: any, song: any) {
		comp.song = JSON.parse(JSON.stringify(song));
		markDirty();
	}

	function copyPageJson() {
		if (!selectedPage) return;
		const data = JSON.parse(JSON.stringify(selectedPage));
		delete data._id; // Don't copy DB ID
		navigator.clipboard.writeText(JSON.stringify(data, null, 2));
		alert("Page JSON copied to clipboard!");
	}

	function applyImport() {
		try {
			const parsed = JSON.parse(importJsonText);
			if (!parsed.pageName && !selectedPage?.pageName) {
				throw new Error("Invalid page data: missing pageName");
			}

			// Keep current page name if importing into existing page
			const pageName = selectedPage?.pageName || parsed.pageName;

			selectedPage = {
				...parsed,
				pageName,
			};

			// Ensure IDs for DND
			if (selectedPage.categories) {
				selectedPage.categories = ensureIds(selectedPage.categories);
				for (const cat of selectedPage.categories) {
					if (!cat.items) cat.items = [];
					if (!cat.requests) cat.requests = [];
					if (!cat.filters) cat.filters = [];
				}
			}

			markDirty();
			showImportModal = false;
			importJsonText = "";
			alert("Data imported successfully! Don't forget to save.");
		} catch (e: any) {
			alert("Import failed: " + e.message);
		}
	}
</script>

<div class="flex h-[calc(100vh-4rem)] -m-6">
	<!-- Left panel: page list -->
	<aside
		class="w-64 border-r border-slate-800 flex flex-col bg-slate-900/50 flex-shrink-0 overflow-hidden"
	>
		<div
			class="p-4 border-b border-slate-800 flex items-center justify-between"
		>
			<h2 class="font-semibold text-white text-sm">Carousel Pages</h2>
			<button
				onclick={() => (showNewPageModal = true)}
				class="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
			>
				<Plus class="w-4 h-4" />
			</button>
		</div>
		<div class="p-3 border-b border-slate-800">
			<div
				class="flex items-center gap-2 bg-slate-800 rounded-md px-2.5 py-1.5 border border-slate-700"
			>
				<Search class="w-3.5 h-3.5 text-slate-500" />
				<input
					bind:value={searchQuery}
					type="text"
					placeholder="Filter pages..."
					class="bg-transparent text-xs text-white outline-none flex-1 placeholder-slate-500"
				/>
			</div>
		</div>
		<div class="flex-1 overflow-y-auto">
			{#if loading && !selectedPage}
				<div class="p-4 space-y-2">
					{#each Array(6) as _}<div
							class="h-9 bg-slate-800 animate-pulse rounded-lg"
						></div>{/each}
				</div>
			{:else}
				{#each filteredPages as page (page.pageName)}
					<div class="flex items-center group relative">
						<button
							onclick={() => selectPage(page)}
							class="flex-1 text-left px-4 py-2.5 text-sm transition-colors font-mono {selectedPage?.pageName ===
							page.pageName
								? 'bg-indigo-600/20 text-indigo-400 border-r-2 border-indigo-500'
								: 'text-slate-400 hover:bg-slate-800 hover:text-white'}"
						>
							<div class="flex flex-col gap-1">
								<span>{page.pageName}</span>
								<div class="flex flex-wrap gap-1">
									{#each pageGameMap[page.pageName.replace(/^\//, "")] || [] as game}
										<span
											class="text-[9px] px-1 rounded-sm border {gameColors[
												game
											] ||
												'bg-slate-800 text-slate-400 border-slate-700'}"
										>
											{game.toUpperCase()}
										</span>
									{/each}
								</div>
							</div>
						</button>
						<button
							onclick={() => deletePage(page.pageName)}
							class="absolute right-2 p-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
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

	<!-- Right panel: category editor -->
	<main class="flex-1 overflow-y-auto p-6 bg-slate-950/20 relative">
		{#if !selectedPage}
			<div
				class="h-full flex flex-col items-center justify-center text-center text-slate-500"
			>
				<div
					class="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4"
				>
					<ChevronRight class="w-8 h-8" />
				</div>
				<p class="font-medium text-white mb-1">Select a page to edit</p>
				<p class="text-sm">
					Click a carousel page on the left to start editing its
					categories.
				</p>
			</div>
		{:else if loading}
			<div
				class="absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-10"
			>
				<div
					class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"
				></div>
			</div>
		{:else}
			<!-- JSON Error Banner -->
			{#if hasJsonErrors}
				<div
					class="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-center gap-4 text-red-400 animate-in fade-in slide-in-from-top-2 duration-300"
				>
					<div
						class="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0"
					>
						<AlertCircle class="w-6 h-6" />
					</div>
					<div class="flex-1">
						<p class="font-bold text-base">JSON Syntax Errors</p>
						<p class="text-sm opacity-80">
							You have {jsonErrors.size} field(s) with invalid JSON.
							Save and Publish are disabled until these are fixed.
						</p>
					</div>
				</div>
			{/if}

			<!-- Page header -->
			<div class="flex items-center justify-between mb-6">
				<div>
					<div class="flex items-center gap-3">
						<h2 class="text-xl font-bold text-white font-mono">
							{selectedPage.pageName}
						</h2>
						<div class="flex gap-1.5">
							{#each pageGameMap[selectedPage.pageName.replace(/^\//, "")] || [] as game}
								<span
									class="text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm {gameColors[
										game
									] ||
										'bg-slate-800 text-slate-400 border-slate-700'}"
								>
									{game.toUpperCase()}
								</span>
							{/each}
						</div>
					</div>
					<label class="flex items-center gap-2 mt-1">
						<input
							type="checkbox"
							bind:checked={selectedPage.onlineOnly}
							onchange={markDirty}
							class="rounded border-slate-600"
						/>
						<span class="text-sm text-slate-400">Online only</span>
					</label>
				</div>
				<div class="flex items-center gap-3">
					{#if isDirty}
						<span
							class="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-1 rounded-full"
							>Unsaved changes</span
						>
					{/if}
					<button
						onclick={addCategory}
						class="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-sm transition-colors border border-slate-700"
					>
						<Plus class="w-4 h-4" /> Add Category
					</button>
					<div class="h-6 w-px bg-slate-800 mx-1"></div>
					<button
						onclick={copyPageJson}
						class="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-sm transition-colors border border-slate-700"
						title="Copy whole page JSON"
					>
						<Download class="w-4 h-4" /> Copy JSON
					</button>
					<button
						onclick={() => {
							importJsonText = "";
							showImportModal = true;
						}}
						class="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-sm transition-colors border border-slate-700"
						title="Import page JSON"
					>
						<Upload class="w-4 h-4" /> Import JSON
					</button>
					<button
						onclick={savePage}
						disabled={saving || !isDirty}
						class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
					>
						{saving ? "Saving..." : "Save Page"}
					</button>
				</div>
			</div>

			<!-- Categories -->
			{#if selectedPage.categories.length === 0}
				<div
					class="border border-dashed border-slate-700 rounded-xl p-10 text-center text-slate-500"
				>
					<p class="mb-3">No categories yet.</p>
					<button
						onclick={addCategory}
						class="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
						>+ Add first category</button
					>
				</div>
			{/if}

			<div
				class="space-y-4 pb-20"
				use:dndzone={{
					items: selectedPage.categories,
					flipDurationMs: 300,
					dropTargetStyle: { outline: "none" },
				}}
				onconsider={handleDndConsider}
				onfinalize={handleDndFinalize}
			>
				{#each selectedPage.categories as cat, catIdx (cat.id)}
					<div
						class="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40"
						animate:flip={{ duration: 300 }}
					>
						<!-- Category Header -->
						<div
							class="flex items-center gap-3 p-4 bg-slate-800/80 group/cat"
						>
							<div
								class="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 p-1"
							>
								<GripVertical class="w-5 h-5" />
							</div>
							<button
								onclick={() => toggleCategory(cat.id)}
								class="text-slate-400 hover:text-white transition-colors"
							>
								{#if expandedCategories.has(cat.id)}
									<ChevronDown class="w-5 h-5" />
								{:else}
									<ChevronRight class="w-5 h-5" />
								{/if}
							</button>
							<div class="flex-1 grid grid-cols-3 gap-3">
								<div class="space-y-0.5">
									<label
										class="text-[10px] uppercase text-slate-500 font-bold tracking-wider"
										>Title</label
									>
									<input
										type="text"
										value={cat.title || ""}
										oninput={(e) => {
											cat.title = e.currentTarget.value;
											markDirty();
										}}
										class="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-sm text-white focus:border-indigo-500 outline-none"
										placeholder="Category title"
									/>
								</div>
								<div class="space-y-0.5">
									<label
										class="text-[10px] uppercase text-slate-500 font-bold tracking-wider"
										>ACT</label
									>
									<input
										type="text"
										value={cat.act || ""}
										oninput={(e) => {
											cat.act = e.currentTarget.value;
											markDirty();
										}}
										class="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-sm text-white font-mono focus:border-indigo-500 outline-none"
										placeholder="ui_carousel"
									/>
								</div>
								<div class="space-y-0.5">
									<label
										class="text-[10px] uppercase text-slate-500 font-bold tracking-wider"
										>ISC</label
									>
									<input
										type="text"
										value={cat.isc || ""}
										oninput={(e) => {
											cat.isc = e.currentTarget.value;
											markDirty();
										}}
										class="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-sm text-white font-mono focus:border-indigo-500 outline-none"
										placeholder="grp_row"
									/>
								</div>
							</div>
							<div class="flex items-center gap-1">
								<button
									onclick={() => duplicateCategory(catIdx)}
									class="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-md transition-colors"
									title="Duplicate Category"
								>
									<Copy class="w-4 h-4" />
								</button>
								<button
									onclick={() => removeCategory(catIdx)}
									class="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</div>
						</div>

						<!-- Category Body -->
						{#if expandedCategories.has(cat.id)}
							<div class="p-4 space-y-6">
								<!-- Category Extra fields -->
								<div class="grid grid-cols-3 gap-3">
									<div class="space-y-0.5">
										<label class="text-xs text-slate-500"
											>Logo URL</label
										>
										<input
											type="text"
											value={cat.logoUrl || ""}
											oninput={(e) => {
												cat.logoUrl =
													e.currentTarget.value;
												markDirty();
											}}
											class="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-sm text-white focus:border-indigo-500 outline-none"
										/>
									</div>
									<div class="space-y-0.5">
										<label class="text-xs text-slate-500"
											>Category Type</label
										>
										<input
											type="text"
											value={cat.categoryType || ""}
											oninput={(e) => {
												cat.categoryType =
													e.currentTarget.value;
												markDirty();
											}}
											class="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-sm text-white focus:border-indigo-500 outline-none"
											placeholder="e.g. recommended"
										/>
									</div>
									<div class="space-y-0.5">
										<label class="text-xs text-slate-500"
											>Order</label
										>
										<input
											type="text"
											value={cat.order ?? ""}
											oninput={(e) => {
												cat.order =
													e.currentTarget.value ||
													undefined;
												markDirty();
											}}
											class="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-sm text-white focus:border-indigo-500 outline-none"
										/>
									</div>
								</div>

								<!-- Category Filters -->
								<div
									class="bg-slate-900 border border-slate-800 rounded-lg p-3"
								>
									<div
										class="flex items-center justify-between mb-2"
									>
										<h4
											class="text-xs font-semibold text-slate-400 flex items-center gap-1.5"
										>
											<Filter class="w-3.5 h-3.5" /> CATEGORY
											FILTERS
										</h4>
										<select
											onchange={(e) => {
												if (e.currentTarget.value) {
													addFilter(
														cat,
														e.currentTarget.value,
													);
													e.currentTarget.value = "";
												}
											}}
											class="text-xs bg-slate-800 text-white rounded border border-slate-700 px-2 py-1 outline-none"
										>
											<option value=""
												>+ Add Filter...</option
											>
											{#each FILTER_CLASSES as f}<option
													value={f}
													>{shortClass(f)}</option
												>{/each}
										</select>
									</div>
									<div class="space-y-2">
										{#if !cat.filters || cat.filters.length === 0}
											<p
												class="text-xs text-slate-600 italic"
											>
												No filters applied. Category
												visible to everyone.
											</p>
										{/if}
										{#each cat.filters || [] as filter, fIdx (filter.id)}
											<div
												class="flex items-start gap-3 bg-slate-800/50 p-2 rounded border border-slate-700"
											>
												<span
													class="text-xs font-mono text-pink-400 mt-1.5 w-32 shrink-0 truncate"
													>{shortClass(
														filter.__class,
													)}</span
												>
												<div class="flex-1">
													{#if filter.__class === "JD_CarouselTimeFilter"}
														<div class="flex gap-2">
															<input
																type="text"
																placeholder="Start (e.g. 2026-05-01T00:00:00Z)"
																value={filter.start ||
																	""}
																oninput={(
																	e,
																) => {
																	filter.start =
																		e
																			.currentTarget
																			.value ||
																		undefined;
																	markDirty();
																}}
																class="flex-1 text-xs bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white"
															/>
															<input
																type="text"
																placeholder="End (e.g. 2026-06-01T00:00:00Z)"
																value={filter.end ||
																	""}
																oninput={(
																	e,
																) => {
																	filter.end =
																		e
																			.currentTarget
																			.value ||
																		undefined;
																	markDirty();
																}}
																class="flex-1 text-xs bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white"
															/>
															<label
																class="flex items-center gap-1 text-xs text-slate-300"
																><input
																	type="checkbox"
																	bind:checked={
																		filter.local
																	}
																	onchange={markDirty}
																/> Local</label
															>
														</div>
													{:else if filter.__class === "JD_CarouselCountryFilter"}
														<div
															class="flex flex-col gap-2"
														>
															<input
																type="text"
																placeholder="Groups (comma separated, e.g. NCSA, EMEA)"
																value={(
																	filter.groups ||
																	[]
																).join(", ")}
																oninput={(
																	e,
																) => {
																	filter.groups =
																		parseFilterArray(
																			e
																				.currentTarget
																				.value,
																		);
																	markDirty();
																}}
																class="w-full text-xs bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white"
															/>
															<input
																type="text"
																placeholder="Countries (comma separated, e.g. US, FR, JP)"
																value={(
																	filter.countries ||
																	[]
																).join(", ")}
																oninput={(
																	e,
																) => {
																	filter.countries =
																		parseFilterArray(
																			e
																				.currentTarget
																				.value,
																		);
																	markDirty();
																}}
																class="w-full text-xs bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white"
															/>
															<label
																class="flex items-center gap-1 text-xs text-slate-300"
																><input
																	type="checkbox"
																	bind:checked={
																		filter.reversed
																	}
																	onchange={markDirty}
																/> Reversed (Exclude)</label
															>
														</div>
													{:else}
														<JsonEditor
															value={JSON.stringify(
																Object.fromEntries(
																	Object.entries(
																		filter,
																	).filter(
																		([k]) =>
																			k !==
																			"__class",
																	),
																),
															)}
															onchange={(val) =>
																updateJsonPayload(
																	filter,
																	val,
																)}
															onvalidate={(
																valid,
															) =>
																updateJsonError(
																	`filter-${filter.id}`,
																	valid,
																)}
														/>
													{/if}
												</div>
												<button
													onclick={() =>
														removeFilter(cat, fIdx)}
													class="text-slate-500 hover:text-red-400 mt-1"
													><Trash2
														class="w-3.5 h-3.5"
													/></button
												>
											</div>
										{/each}
									</div>
								</div>

								<!-- Category Dynamic Requests -->
								<div
									class="bg-indigo-900/10 border border-indigo-500/20 rounded-lg p-3"
								>
									<div
										class="flex items-center justify-between mb-3"
									>
										<h4
											class="text-xs font-semibold text-indigo-400 flex items-center gap-1.5"
										>
											<Zap class="w-3.5 h-3.5" /> DYNAMIC REQUESTS
										</h4>
										<select
											onchange={(e) => {
												if (e.currentTarget.value) {
													addRequest(
														cat,
														e.currentTarget.value,
													);
													e.currentTarget.value = "";
												}
											}}
											class="text-xs bg-slate-800 text-white rounded border border-slate-700 px-2 py-1 outline-none"
										>
											<option value=""
												>+ Add Dynamic Request...</option
											>
											{#each REQUEST_CLASSES as r}<option
													value={r}
													>{shortClass(r)}</option
												>{/each}
										</select>
									</div>
									<div class="space-y-3">
										{#if !cat.requests || cat.requests.length === 0}
											<p
												class="text-xs text-slate-600 italic"
											>
												No dynamic requests. This
												category only uses static items.
											</p>
										{/if}
										{#each cat.requests || [] as request, rIdx (request.id)}
											<div
												class="bg-slate-800/80 border border-indigo-500/30 p-3 rounded-lg relative group"
											>
												<button
													onclick={() =>
														removeRequest(
															cat,
															rIdx,
														)}
													class="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 transition-colors"
												>
													<Trash2
														class="w-3.5 h-3.5"
													/>
												</button>
												<div
													class="flex items-center gap-2 mb-2"
												>
													<span
														class="text-xs font-mono font-bold text-indigo-400"
														>{shortClass(
															request.__class,
														)}</span
													>
												</div>
												<div
													class="grid grid-cols-2 gap-3"
												>
													{#if request.__class === "JD_CarouselSmartSongRequestDesc"}
														<div
															class="col-span-2 space-y-1"
														>
															<label
																class="text-[10px] text-slate-500 uppercase font-bold"
																>MongoDB Filters
																(JSON)</label
															>
															<JsonEditor
																value={JSON.stringify(
																	request.filters ||
																		{},
																)}
																onchange={(
																	val,
																) =>
																	updateJsonPayload(
																		request,
																		val,
																		[
																			"__class",
																			"maxCount",
																			"actionListName",
																			"actionListNameUpsell",
																			"order",
																		],
																	)}
																onvalidate={(
																	valid,
																) =>
																	updateJsonError(
																		`req-${request.id}-filters`,
																		valid,
																	)}
															/>
														</div>
													{/if}
													<div class="space-y-1">
														<label
															class="text-[10px] text-slate-500 uppercase font-bold"
															>Action List</label
														>
														<select
															value={request.actionListName ||
																""}
															onchange={(e) => {
																request.actionListName =
																	e.currentTarget.value;
																markDirty();
															}}
															class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
														>
															<option value=""
																>Select...</option
															>
															{#each actionListNames as name}<option
																	value={name}
																	>{name}</option
																>{/each}
														</select>
													</div>
													<div class="space-y-1">
														<label
															class="text-[10px] text-slate-500 uppercase font-bold"
															>Max Count</label
														>
														<input
															type="number"
															value={request.maxCount ||
																24}
															oninput={(e) => {
																request.maxCount =
																	parseInt(
																		e
																			.currentTarget
																			.value,
																	);
																markDirty();
															}}
															class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
														/>
													</div>

													<!-- Raw Payload for other types -->
													{#if request.__class !== "JD_CarouselSmartSongRequestDesc"}
														<div
															class="col-span-2 space-y-1"
														>
															<label
																class="text-[10px] text-slate-500 uppercase font-bold"
																>Config Payload
																(JSON)</label
															>
															<JsonEditor
																value={JSON.stringify(
																	Object.fromEntries(
																		Object.entries(
																			request,
																		).filter(
																			([
																				k,
																			]) =>
																				![
																					"__class",
																					"actionListName",
																					"maxCount",
																				].includes(
																					k,
																				),
																		),
																	),
																)}
																onchange={(
																	val,
																) =>
																	updateJsonPayload(
																		request,
																		val,
																		[
																			"__class",
																			"actionListName",
																			"maxCount",
																		],
																	)}
																onvalidate={(
																	valid,
																) =>
																	updateJsonError(
																		`req-${request.id}-payload`,
																		valid,
																	)}
															/>
														</div>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</div>

								<!-- Items List -->
								<div>
									<div
										class="flex items-center justify-between mb-3"
									>
										<h4
											class="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2"
										>
											<Layers class="w-4 h-4" /> Items ({cat
												.items.length})
										</h4>
										<button
											onclick={() => addItem(cat)}
											class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded font-medium transition-colors"
											>+ Add Item</button
										>
									</div>

									<div class="space-y-3">
										{#each cat.items as item, itemIdx (item.id)}
											<div
												class="border border-slate-700 rounded-lg overflow-hidden bg-slate-800/30"
											>
												<!-- Item Header -->
												<div
													class="flex items-center gap-3 p-3 bg-slate-800/80 border-b border-slate-700"
												>
													<button
														onclick={() =>
															toggleItem(
																cat.id,
																item.id,
															)}
														class="text-slate-400 hover:text-white transition-colors"
													>
														{#if expandedItems[cat.id]?.has(item.id)}
															<ChevronDown
																class="w-4 h-4"
															/>
														{:else}
															<ChevronRight
																class="w-4 h-4"
															/>
														{/if}
													</button>
													<div
														class="flex-1 flex items-center gap-2"
													>
														<span
															class="text-xs font-mono font-bold text-slate-300"
															>Item #{itemIdx +
																1}</span
														>

														<!-- Quick summary tag -->
														{#if item.offlineRequest}
															<span
																class="text-[10px] uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
															>
																{shortClass(
																	item
																		.offlineRequest
																		.__class,
																)}
															</span>
														{:else if item.components && item.components.length > 0}
															<span
																class="text-[10px] uppercase px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30"
															>
																{item.components
																	.length} Components
															</span>
														{:else}
															<span
																class="text-[10px] uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30"
																>Empty</span
															>
														{/if}
													</div>
													<button
														onclick={() =>
															removeItem(
																cat,
																itemIdx,
															)}
														class="text-slate-500 hover:text-red-400"
														><Trash2
															class="w-4 h-4"
														/></button
													>
												</div>

												<!-- Item Body -->
												{#if expandedItems[cat.id]?.has(item.id)}
													<div class="p-3 space-y-4">
														<!-- Item overrides -->
														<div
															class="grid grid-cols-3 gap-2"
														>
															<input
																type="text"
																value={item.act ||
																	""}
																oninput={(
																	e,
																) => {
																	item.act =
																		e
																			.currentTarget
																			.value ||
																		undefined;
																	markDirty();
																}}
																placeholder="Item ACT override"
																class="text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono"
															/>
															<input
																type="text"
																value={item.isc ||
																	""}
																oninput={(
																	e,
																) => {
																	item.isc =
																		e
																			.currentTarget
																			.value ||
																		undefined;
																	markDirty();
																}}
																placeholder="Item ISC override"
																class="text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono"
															/>
															<select
																value={item.actionList ||
																	""}
																onchange={(
																	e,
																) => {
																	item.actionList =
																		e
																			.currentTarget
																			.value ||
																		undefined;
																	markDirty();
																}}
																class="text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
															>
																<option value=""
																	>No
																	ActionList</option
																>
																{#each actionListNames as name}<option
																		value={name}
																		>{name}</option
																	>{/each}
															</select>
														</div>

														<!-- Payload Configuration -->
														<div
															class="border border-slate-700 p-3 rounded bg-slate-900/50"
														>
															<h5
																class="text-[11px] font-bold text-slate-400 mb-3 flex items-center gap-1.5"
															>
																<Zap
																	class="w-3.5 h-3.5"
																/> PAYLOAD CONFIGURATION
															</h5>

															{#if item.offlineRequest}
																<div
																	class="space-y-3"
																>
																	<div
																		class="flex items-center gap-2"
																	>
																		<span
																			class="text-xs font-semibold text-indigo-400 w-32 shrink-0"
																			>Offline
																			Request:</span
																		>
																		<select
																			value={item
																				.offlineRequest
																				.__class}
																			onchange={(
																				e,
																			) => {
																				setOfflineRequest(
																					item,
																					e
																						.currentTarget
																						.value,
																				);
																			}}
																			class="flex-1 text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white outline-none"
																		>
																			{#each OFFLINE_REQUEST_CLASSES as cls}<option
																					value={cls}
																					>{cls}</option
																				>{/each}
																		</select>
																		<button
																			onclick={() =>
																				removeOfflineRequest(
																					item,
																				)}
																			class="text-xs text-red-400 hover:underline"
																			>Remove</button
																		>
																	</div>

																	<div
																		class="bg-slate-800/50 border border-slate-700 p-2 rounded flex gap-2"
																	>
																		{#if item.offlineRequest.__class === "JD_CarouselMapRequest"}
																			<div
																				class="flex-1 space-y-0.5"
																			>
																				<label
																					class="text-[10px] text-slate-500 uppercase"
																					>Map
																					Name</label
																				>
																				<input
																					list="songs-datalist"
																					value={item
																						.offlineRequest
																						.mapName ||
																						""}
																					oninput={(
																						e,
																					) => {
																						item.offlineRequest!.mapName =
																							e.currentTarget.value;
																						markDirty();
																					}}
																					class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
																				/>
																			</div>
																		{:else if item.offlineRequest.__class === "JD_CarouselItemRequest"}
																			<div
																				class="flex-1 space-y-0.5"
																			>
																				<label
																					class="text-[10px] text-slate-500 uppercase"
																					>Item
																					List</label
																				>
																				<select
																					value={item
																						.offlineRequest
																						.itemList ||
																						""}
																					onchange={(
																						e,
																					) => {
																						item.offlineRequest!.itemList =
																							e.currentTarget.value;
																						markDirty();
																					}}
																					class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
																				>
																					<option
																						value=""
																						>Select
																						list...</option
																					>
																					{#each itemListNames as name}<option
																							value={name}
																							>{name}</option
																						>{/each}
																				</select>
																			</div>
																		{/if}
																		<div
																			class="flex-1 space-y-0.5"
																		>
																			<label
																				class="text-[10px] text-slate-500 uppercase"
																				>Action
																				List</label
																			>
																			<select
																				value={item
																					.offlineRequest
																					.actionListName ||
																					""}
																				onchange={(
																					e,
																				) => {
																					item.offlineRequest!.actionListName =
																						e.currentTarget.value;
																					markDirty();
																				}}
																				class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
																			>
																				<option
																					value=""
																					>None</option
																				>
																				{#each actionListNames as name}<option
																						value={name}
																						>{name}</option
																					>{/each}
																			</select>
																		</div>
																		<div
																			class="flex-1 space-y-0.5"
																		>
																			<label
																				class="text-[10px] text-slate-500 uppercase"
																				>Upsell
																				Action
																				List</label
																			>
																			<select
																				value={item
																					.offlineRequest
																					.actionListNameUpsell ||
																					""}
																				onchange={(
																					e,
																				) => {
																					item.offlineRequest!.actionListNameUpsell =
																						e.currentTarget.value;
																					markDirty();
																				}}
																				class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
																			>
																				<option
																					value=""
																					>None</option
																				>
																				{#each actionListNames as name}<option
																						value={name}
																						>{name}</option
																					>{/each}
																			</select>
																		</div>
																	</div>

																	<!-- Raw offlineRequest JSON for extra fields like includedTags -->
																	<div
																		class="space-y-0.5"
																	>
																		<label
																			class="text-[10px] text-slate-500 uppercase"
																			>Additional
																			JSON
																			Payload</label
																		>
																		<JsonEditor
																			value={JSON.stringify(
																				Object.fromEntries(
																					Object.entries(
																						item.offlineRequest,
																					).filter(
																						([
																							k,
																						]) =>
																							![
																								"__class",
																								"mapName",
																								"itemList",
																								"actionListName",
																								"actionListNameUpsell",
																							].includes(
																								k,
																							),
																					),
																				),
																			)}
																			onchange={(
																				val,
																			) =>
																				updateJsonPayload(
																					item.offlineRequest,
																					val,
																					[
																						"__class",
																						"mapName",
																						"itemList",
																						"actionListName",
																						"actionListNameUpsell",
																					],
																				)}
																			onvalidate={(
																				valid,
																			) =>
																				updateJsonError(
																					`item-${item.id}-offline`,
																					valid,
																				)}
																		/>
																	</div>
																</div>
																<!-- Components array -->
																<div
																	class="space-y-2"
																>
																	<div
																		class="flex items-center justify-between mb-1"
																	>
																		<span
																			class="text-xs font-semibold text-purple-400"
																			>Components:</span
																		>
																		<select
																			onchange={(
																				e,
																			) => {
																				if (
																					e
																						.currentTarget
																						.value
																				) {
																					addComponent(
																						item,
																						e
																							.currentTarget
																							.value,
																					);
																					e.currentTarget.value =
																						"";
																				}
																			}}
																			class="text-xs bg-slate-800 text-white rounded border border-slate-700 px-2 py-1 outline-none"
																		>
																			<option
																				value=""
																				>+
																				Add
																				Component...</option
																			>
																			{#each COMPONENT_CLASSES as cls}<option
																					value={cls}
																					>{shortClass(
																						cls,
																					)}</option
																				>{/each}
																		</select>
																	</div>

																	{#if !item.components || item.components.length === 0}
																		<div
																			class="text-xs text-slate-500 py-2 text-center border border-dashed border-slate-700 rounded"
																		>
																			No
																			offlineRequest
																			and
																			no
																			components.
																			Select
																			one
																			from
																			the
																			dropdowns
																			to
																			configure
																			this
																			item.
																			<div
																				class="mt-2 text-indigo-400 hover:underline cursor-pointer"
																				onclick={() =>
																					setOfflineRequest(
																						item,
																						"JD_CarouselMapRequest",
																					)}
																			>
																				Or
																				set
																				an
																				OfflineRequest
																				instead
																			</div>
																		</div>
																	{/if}

																	{#each item.components || [] as comp, cIdx (comp.id)}
																		<div
																			class="flex items-start gap-2 bg-slate-800/50 p-2 rounded border border-slate-700"
																		>
																			<span
																				class="text-xs font-mono text-purple-300 mt-1.5 w-32 shrink-0 truncate"
																				>{shortClass(
																					comp.__class,
																				)}</span
																			>
																			<div
																				class="flex-1"
																			>
																				{#if comp.__class === "JD_CarouselContentComponent_Song"}
																					<div
																						class="space-y-2"
																					>
																						<div
																							class="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-lg p-2"
																						>
																							{#if comp.song}
																								{@const selectedSong =
																									comp.song}
																								<img
																									src={getSongThumbnail(
																										selectedSong,
																									)}
																									class="size-10 rounded object-cover bg-slate-800"
																									alt=""
																								/>
																								<div
																									class="flex-1 min-w-0"
																								>
																									<div
																										class="text-xs font-bold text-white truncate"
																									>
																										{selectedSong.title}
																									</div>
																									<div
																										class="text-[10px] text-slate-400 truncate"
																									>
																										{selectedSong.artist}
																										({selectedSong.mapName})
																									</div>
																								</div>
																							{:else}
																								<div
																									class="size-10 rounded bg-slate-800 flex items-center justify-center"
																								>
																									<Music
																										class="w-4 h-4 text-slate-600"
																									/>
																								</div>
																								<div
																									class="text-xs text-slate-500 italic"
																								>
																									No
																									song
																									selected
																								</div>
																							{/if}

																							<div
																								class="relative group/picker min-w-[200px]"
																							>
																								<input
																									type="text"
																									placeholder="Search song to change..."
																									class="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
																									oninput={(
																										e,
																									) => {
																										songSearchQuery =
																											e
																												.currentTarget
																												.value;
																									}}
																									onfocus={(
																										e,
																									) => {
																										activePickerComp =
																											comp;
																										songSearchQuery =
																											e
																												.currentTarget
																												.value;
																									}}
																									onblur={() => {
																										setTimeout(
																											() => {
																												if (
																													activePickerComp ===
																													comp
																												)
																													activePickerComp =
																														null;
																											},
																											200,
																										);
																									}}
																								/>
																								{#if activePickerComp === comp}
																									<div
																										class="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto"
																									>
																										{#if songs}
																											{@const filteredSongs =
																												songSearchQuery.trim() ===
																												""
																													? songs.slice(
																															0,
																															10,
																														)
																													: songs
																															.filter(
																																(
																																	s,
																																) =>
																																	s.title
																																		.toLowerCase()
																																		.includes(
																																			songSearchQuery.toLowerCase(),
																																		) ||
																																	s.mapName
																																		.toLowerCase()
																																		.includes(
																																			songSearchQuery.toLowerCase(),
																																		) ||
																																	s.artist
																																		.toLowerCase()
																																		.includes(
																																			songSearchQuery.toLowerCase(),
																																		),
																															)
																															.slice(
																																0,
																																20,
																															)}

																											{#if filteredSongs.length === 0}
																												<div
																													class="p-3 text-xs text-slate-500 italic text-center"
																												>
																													No
																													songs
																													found
																												</div>
																											{/if}

																											{#each filteredSongs as s}
																												<button
																													onmousedown={(
																														e,
																													) => {
																														e.preventDefault();
																														selectSongForComponent(
																															comp,
																															s,
																														);
																														activePickerComp =
																															null;
																														songSearchQuery =
																															"";
																													}}
																													class="w-full flex items-center gap-2 p-2 hover:bg-slate-700 transition-colors text-left border-b border-slate-700/50 last:border-0"
																												>
																													<img
																														src={getSongThumbnail(
																															s,
																														)}
																														class="size-8 rounded object-cover bg-slate-900"
																														alt=""
																													/>
																													<div
																														class="flex-1 min-w-0"
																													>
																														<div
																															class="text-xs font-medium text-white truncate"
																														>
																															{s.title}
																														</div>
																														<div
																															class="text-[10px] text-slate-400 truncate"
																														>
																															{s.mapName}
																														</div>
																													</div>
																												</button>
																											{/each}
																										{/if}
																									</div>
																								{/if}
																							</div>
																						</div>
																					</div>
																				{:else}
																					<JsonEditor
																						value={JSON.stringify(
																							Object.fromEntries(
																								Object.entries(
																									comp,
																								).filter(
																									([
																										k,
																									]) =>
																										k !==
																										"__class",
																								),
																							),
																						)}
																						onchange={(
																							val,
																						) =>
																							updateJsonPayload(
																								comp,
																								val,
																							)}
																						onvalidate={(
																							valid,
																						) =>
																							updateJsonError(
																								`comp-${comp.id}`,
																								valid,
																							)}
																					/>
																				{/if}
																			</div>
																			<button
																				onclick={() =>
																					removeComponent(
																						item,
																						cIdx,
																					)}
																				class="text-slate-500 hover:text-red-400 mt-1"
																				><Trash2
																					class="w-3.5 h-3.5"
																				/></button
																			>
																		</div>
																	{/each}
																</div>
															{/if}
														</div>

														<!-- Item Filters -->
														<div
															class="border border-slate-700 rounded bg-slate-900/50 p-3"
														>
															<div
																class="flex items-center justify-between mb-2"
															>
																<h5
																	class="text-[11px] font-bold text-slate-400 flex items-center gap-1.5"
																>
																	<Filter
																		class="w-3.5 h-3.5"
																	/> ITEM FILTERS
																</h5>
																<select
																	onchange={(
																		e,
																	) => {
																		if (
																			e
																				.currentTarget
																				.value
																		) {
																			addFilter(
																				item,
																				e
																					.currentTarget
																					.value,
																			);
																			e.currentTarget.value =
																				"";
																		}
																	}}
																	class="text-xs bg-slate-800 text-white rounded border border-slate-700 px-2 py-1 outline-none"
																>
																	<option
																		value=""
																		>+ Add
																		Filter...</option
																	>
																	{#each FILTER_CLASSES as f}<option
																			value={f}
																			>{shortClass(
																				f,
																			)}</option
																		>{/each}
																</select>
															</div>
															<div
																class="space-y-2"
															>
																{#each item.filters || [] as filter, fIdx (filter.id)}
																	<div
																		class="flex items-start gap-2 bg-slate-800/50 p-2 rounded border border-slate-700"
																	>
																		<span
																			class="text-xs font-mono text-pink-400 mt-1.5 w-32 shrink-0 truncate"
																			>{shortClass(
																				filter.__class,
																			)}</span
																		>
																		<div
																			class="flex-1"
																		>
																			<JsonEditor
																				value={JSON.stringify(
																					Object.fromEntries(
																						Object.entries(
																							filter,
																						).filter(
																							([
																								k,
																							]) =>
																								k !==
																								"__class",
																						),
																					),
																				)}
																				onchange={(
																					val,
																				) =>
																					updateJsonPayload(
																						filter,
																						val,
																					)}
																				onvalidate={(
																					valid,
																				) =>
																					updateJsonError(
																						`item-filter-${filter.id}`,
																						valid,
																					)}
																			/>
																		</div>
																		<button
																			onclick={() =>
																				removeFilter(
																					item,
																					fIdx,
																				)}
																			class="text-slate-500 hover:text-red-400 mt-1"
																			><Trash2
																				class="w-3.5 h-3.5"
																			/></button
																		>
																	</div>
																{/each}
															</div>
														</div>
													</div>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>

<!-- Songs autocomplete datalist -->
<datalist id="songs-datalist">
	{#each songs as song}<option value={song.mapName}
			>{song.title} – {song.artist}</option
		>{/each}
</datalist>

<!-- New Page Modal -->
{#if showNewPageModal}
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
	>
		<div
			class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6"
		>
			<h3 class="text-lg font-bold text-white mb-4">Create New Page</h3>
			<div class="space-y-1.5 mb-5">
				<label class="text-xs text-slate-400 uppercase tracking-wider"
					>Page Route</label
				>
				<input
					type="text"
					bind:value={newPageName}
					placeholder="/party"
					class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white font-mono text-sm focus:border-indigo-500 outline-none"
				/>
			</div>
			<div class="flex justify-end gap-3">
				<button
					onclick={() => {
						showNewPageModal = false;
						newPageName = "";
					}}
					class="px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
					>Cancel</button
				>
				<button
					onclick={createPage}
					class="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
					>Create</button
				>
			</div>
		</div>
	</div>
{/if}

<!-- Import Page Modal -->
{#if showImportModal}
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
	>
		<div
			class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl p-6"
		>
			<div class="flex items-center gap-3 mb-4">
				<div
					class="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400"
				>
					<FileJson class="w-6 h-6" />
				</div>
				<div>
					<h3 class="text-lg font-bold text-white">
						Import Page Data
					</h3>
					<p class="text-xs text-slate-400">
						Paste the full page JSON object below to overwrite the
						current configuration.
					</p>
				</div>
			</div>

			<div class="space-y-1.5 mb-5">
				<textarea
					bind:value={importJsonText}
					placeholder={JSON.stringify(
						{
							pageName: "/example",
							onlineOnly: false,
							categories: [],
						},
						null,
						2,
					)}
					class="w-full h-80 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white font-mono text-xs focus:border-indigo-500 outline-none resize-none"
				></textarea>
			</div>

			<div class="flex justify-end gap-3">
				<button
					onclick={() => {
						showImportModal = false;
						importJsonText = "";
					}}
					class="px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={applyImport}
					disabled={!importJsonText.trim()}
					class="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
				>
					Apply Import
				</button>
			</div>
		</div>
	</div>
{/if}
