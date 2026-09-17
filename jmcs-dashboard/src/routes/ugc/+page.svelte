<script lang="ts">
	import { onMount } from "svelte";
	import { fetchApi } from "$lib/api";
	import { Film, Search, Video } from "lucide-svelte";
	import PageHeader from "$lib/components/PageHeader.svelte";
	import { toast } from "$lib/toast";
	import { refreshTrigger } from "$lib/jmcs";
	import UgcFilters from "$lib/components/ugc/UgcFilters.svelte";
	import UgcTable from "$lib/components/ugc/UgcTable.svelte";
	import UgcDetailModal from "$lib/components/ugc/UgcDetailModal.svelte";
	import UgcModerateModal from "$lib/components/ugc/UgcModerateModal.svelte";
	import UgcTagsModal from "$lib/components/ugc/UgcTagsModal.svelte";
	import UgcDeleteConfirm from "$lib/components/ugc/UgcDeleteConfirm.svelte";
	import UgcCreateCvModal from "$lib/components/ugc/UgcCreateCvModal.svelte";
	import { getUgcId } from "$lib/components/ugc/ugc-constants";

	// ─── State ────────────────────────────────────────────────────
	let ugcs: any[] = $state([]);
	let loading = $state(true);
	let total = $state(0);
	let errorMessage = $state("");

	// Filters
	let searchQuery = $state("");
	let activeTypeFilter = $state("");
	let activeView = $state<"all" | "pending" | "reported">("all");
	let currentPage = $state(1);
	const perPage = 50;

	// Stats
	let pendingCount = $state(0);
	let reportedCount = $state(0);

	// Detail modal
	let showDetailModal = $state(false);
	let selectedDetailUgc: any = $state(null);

	// Moderate modal
	let showModerateModal = $state(false);
	let moderateUgc: any = $state(null);
	let moderateApproved = $state(true);
	let moderateBanReason = $state("");
	let moderating = $state(false);

	// Tags modal
	let showTagsModal = $state(false);
	let tagsUgc: any = $state(null);
	let tagsInput = $state("");
	let savingTags = $state(false);

	// Delete confirm
	let showDeleteConfirm = $state(false);
	let deleteUgc: any = $state(null);
	let deleting = $state(false);

	// Create CV
	let showCreateCvModal = $state(false);
	let cvForm = $state({ title: "", text: "", time: Math.floor(Date.now() / 1000), fileName: "video.webm", mimetype: "video/webm" });
	let cvStep = $state<"form" | "upload">("form");
	let cvResult = $state<any>(null);
	let cvFile = $state<File | null>(null);
	let creatingCv = $state(false);
	let uploadingCv = $state(false);
	let uploadProgress = $state("");

	// Sorting
	let sortCol = $state<string | null>("time");
	let sortDesc = $state(true);

	// ─── Data Loading ─────────────────────────────────────────────
	async function loadStats() {
		try {
			const [pending, reported] = await Promise.all([
				fetchApi<{ count: number }>(`manage-ugc/pending-count?type=${activeTypeFilter}`),
				fetchApi<{ count: number }>(`manage-ugc/reported-count?type=${activeTypeFilter}`),
			]);
			pendingCount = pending.count ?? 0;
			reportedCount = reported.count ?? 0;
		} catch (e) {
			// silently fail
		}
	}

	async function load(quiet = false) {
		try {
			if (!quiet) loading = true;
			errorMessage = "";

			let endpoint: string;
			if (activeView === "pending") {
				endpoint = `manage-ugc/list-pending?count=${perPage}&type=${activeTypeFilter}`;
			} else if (activeView === "reported") {
				endpoint = `manage-ugc/list-reported?offset=${(currentPage - 1) * perPage}&count=${perPage}&type=${activeTypeFilter}`;
			} else {
				const q = new URLSearchParams({
					page: currentPage.toString(),
					limit: perPage.toString(),
					type: activeTypeFilter,
				});
				if (searchQuery) q.set("profileId", searchQuery);
				endpoint = `manage-ugc/list?${q.toString()}`;
			}

			const res = await fetchApi<any>(endpoint);
			const items = Array.isArray(res) ? res : (res.ugcs || []);
			ugcs = items;
			total = Array.isArray(res) ? items.length : (res.total || items.length);
		} catch (e: any) {
			errorMessage = e.message || "Failed to load UGC data.";
			ugcs = [];
		} finally {
			loading = false;
		}

		loadStats();
	}

	onMount(() => {
		load();
	});

	$effect(() => {
		if ($refreshTrigger) load();
	});

	let searchTimeout: any;
	$effect(() => {
		searchQuery;
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			currentPage = 1;
			load();
		}, 300);
	});

	$effect(() => {
		activeTypeFilter;
		activeView;
		currentPage = 1;
		load();
	});

	let maxPage = $derived(Math.max(1, Math.ceil(total / perPage)));

	// ─── Sorting ──────────────────────────────────────────────────
	let sortedUgcs = $derived.by(() => {
		const result = [...ugcs];
		if (sortCol) {
			result.sort((a, b) => {
				let valA = a[sortCol] ?? "";
				let valB = b[sortCol] ?? "";
				if (typeof valA === "string") valA = valA.toLowerCase();
				if (typeof valB === "string") valB = valB.toLowerCase();
				if (valA < valB) return sortDesc ? 1 : -1;
				if (valA > valB) return sortDesc ? -1 : 1;
				return 0;
			});
		}
		return result;
	});

	function toggleSort(col: string) {
		if (sortCol === col) {
			sortDesc = !sortDesc;
		} else {
			sortCol = col;
			sortDesc = true;
		}
	}

	// ─── Detail Modal ─────────────────────────────────────────────
	async function openDetail(ugc: any) {
		const id = getUgcId(ugc);
		if (!id) {
			selectedDetailUgc = ugc;
			showDetailModal = true;
			return;
		}
		try {
			const res = await fetchApi<any>(`manage-ugc/get/${id}`);
			selectedDetailUgc = res.ugc || res;
		} catch (e: any) {
			selectedDetailUgc = ugc;
		}
		showDetailModal = true;
	}

	function closeDetail() {
		showDetailModal = false;
		selectedDetailUgc = null;
	}

	// ─── Moderate ─────────────────────────────────────────────────
	function openModerate(ugc: any, approved: boolean) {
		moderateUgc = ugc;
		moderateApproved = approved;
		moderateBanReason = "";
		showModerateModal = true;
	}

	async function confirmModerate() {
		moderating = true;
		try {
			await fetchApi(`manage-ugc/moderate/${getUgcId(moderateUgc)}`, {
				method: "PUT",
				body: JSON.stringify({
					approved: moderateApproved,
					banReason: moderateApproved ? undefined : moderateBanReason,
				}),
			});
			toast.success(moderateApproved ? "UGC approved!" : "UGC denied.");
			showModerateModal = false;
			await load();
		} catch (e: any) {
			toast.error("Moderation failed: " + e.message);
		} finally {
			moderating = false;
		}
	}

	function closeModerate() {
		showModerateModal = false;
		moderateUgc = null;
	}

	// ─── Feature / Unfeature ──────────────────────────────────────
	async function toggleFeature(ugc: any) {
		try {
			if (ugc.featured) {
				await fetchApi(`manage-ugc/unfeature/${getUgcId(ugc)}`, { method: "DELETE" });
				toast.success("Unfeatured!");
			} else {
				await fetchApi(`manage-ugc/feature/${getUgcId(ugc)}`, { method: "PUT" });
				toast.success("Featured!");
			}
			await load();
		} catch (e: any) {
			toast.error("Failed: " + e.message);
		}
	}

	// ─── Tags ─────────────────────────────────────────────────────
	function openTags(ugc: any) {
		tagsUgc = ugc;
		tagsInput = (ugc.tags || []).join(", ");
		showTagsModal = true;
	}

	async function saveTags() {
		savingTags = true;
		try {
			const tags = tagsInput
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);
			await fetchApi(`manage-ugc/tags/${getUgcId(tagsUgc)}`, {
				method: "PUT",
				body: JSON.stringify({ tags }),
			});
			toast.success("Tags updated!");
			showTagsModal = false;
			await load();
		} catch (e: any) {
			toast.error("Failed to save tags: " + e.message);
		} finally {
			savingTags = false;
		}
	}

	function closeTags() {
		showTagsModal = false;
		tagsUgc = null;
	}

	// ─── Delete ───────────────────────────────────────────────────
	function confirmDelete(ugc: any) {
		deleteUgc = ugc;
		showDeleteConfirm = true;
	}

	async function executeDelete() {
		deleting = true;
		try {
			await fetchApi(`manage-ugc/update/${getUgcId(deleteUgc)}`, {
				method: "PUT",
				body: JSON.stringify({ deleted: 1 }),
			});
			toast.success("UGC deleted.");
			showDeleteConfirm = false;
			await load();
		} catch (e: any) {
			toast.error("Delete failed: " + e.message);
		} finally {
			deleting = false;
		}
	}

	function closeDelete() {
		showDeleteConfirm = false;
		deleteUgc = null;
	}

	// ─── Create CV ────────────────────────────────────────────────
	async function createCv() {
		creatingCv = true;
		try {
			const body = JSON.stringify({
				title: cvForm.title,
				text: cvForm.text,
				time: cvForm.time,
				content: { [cvForm.fileName]: { mimetype: cvForm.mimetype } },
			});
			const res = await fetchApi<any>("manage-ugc/create-cv", {
				method: "POST",
				body,
			});
			cvResult = res;
			cvStep = "upload";
			toast.success("CV UGC created! Now upload the video file.");
		} catch (e: any) {
			toast.error("Failed to create CV: " + e.message);
		} finally {
			creatingCv = false;
		}
	}

	async function uploadCvVideo() {
		if (!cvFile || !cvResult) return;
		uploadingCv = true;
		uploadProgress = "Uploading...";
		try {
			const url = cvResult.content?.[cvForm.fileName]?.url;
			if (!url) throw new Error("No signed upload URL in response");

			const res = await fetch(url, {
				method: "PUT",
				headers: { "Content-Type": cvForm.mimetype },
				body: cvFile,
			});

			if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);

			toast.success("Video uploaded successfully!");
			closeCvModal();
			await load();
		} catch (e: any) {
			toast.error("Upload failed: " + e.message);
		} finally {
			uploadingCv = false;
			uploadProgress = "";
		}
	}

	function closeCvModal() {
		showCreateCvModal = false;
		cvStep = "form";
		cvResult = null;
		cvFile = null;
		uploadProgress = "";
		cvForm = { title: "", text: "", time: Math.floor(Date.now() / 1000), fileName: "video.webm", mimetype: "video/webm" };
	}
</script>

<div class="max-w-[1600px] mx-auto space-y-8 pb-12">
	<PageHeader
		title="UGC Management"
		description="Manage user-generated content across all types: Autodance, Showtime, Dance Machine, Challenge, Community Remix, and Menu Videos."
		icon={Film}
	>
		{#snippet children()}
			<div class="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-2 w-72 focus-within:border-indigo-500/50 transition-all backdrop-blur-md">
				<Search class="w-4 h-4 text-slate-500" />
				<input
					bind:value={searchQuery}
					type="text"
					placeholder="Search by profile ID..."
					class="bg-transparent text-sm text-white outline-none w-full placeholder-slate-600"
				/>
			</div>
		{/snippet}

		{#snippet actions()}
			<button
				onclick={() => { showCreateCvModal = true; }}
				class="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-purple-500/20 active:scale-95"
			>
				<Video class="w-4 h-4" /> Create Menu Video
			</button>
		{/snippet}
	</PageHeader>

	<UgcFilters
		{activeView}
		{activeTypeFilter}
		{pendingCount}
		{reportedCount}
		onViewChange={(v) => (activeView = v)}
		onTypeChange={(t) => (activeTypeFilter = t)}
	/>

	<UgcTable
		ugcs={sortedUgcs}
		{loading}
		{errorMessage}
		{total}
		{currentPage}
		{maxPage}
		{sortCol}
		{sortDesc}
		onReload={() => load()}
		onToggleSort={toggleSort}
		onPageChange={(p) => (currentPage = p)}
		onDetail={openDetail}
		onModerate={openModerate}
		onToggleFeature={toggleFeature}
		onTags={openTags}
		onDelete={confirmDelete}
	/>
</div>

<UgcDetailModal
	show={showDetailModal}
	ugc={selectedDetailUgc}
	onClose={closeDetail}
	onModerate={openModerate}
	onToggleFeature={toggleFeature}
	onOpenTags={openTags}
/>

<UgcModerateModal
	show={showModerateModal}
	ugc={moderateUgc}
	approved={moderateApproved}
	bind:banReason={moderateBanReason}
	{moderating}
	onClose={closeModerate}
	onBanReasonChange={(r) => (moderateBanReason = r)}
	onConfirm={confirmModerate}
/>

<UgcTagsModal
	show={showTagsModal}
	ugc={tagsUgc}
	bind:tagsInput={tagsInput}
	saving={savingTags}
	onClose={closeTags}
	onTagsChange={(t) => (tagsInput = t)}
	onSave={saveTags}
/>

<UgcDeleteConfirm
	show={showDeleteConfirm}
	ugc={deleteUgc}
	{deleting}
	onClose={closeDelete}
	onConfirm={executeDelete}
/>

<UgcCreateCvModal
	show={showCreateCvModal}
	bind:form={cvForm}
	bind:step={cvStep}
	bind:result={cvResult}
	bind:file={cvFile}
	creatingCv={creatingCv}
	uploadingCv={uploadingCv}
	uploadProgress={uploadProgress}
	onClose={closeCvModal}
	onFormChange={(f) => (cvForm = f)}
	onFileChange={(f) => (cvFile = f)}
	onCreate={createCv}
	onUpload={uploadCvVideo}
/>
