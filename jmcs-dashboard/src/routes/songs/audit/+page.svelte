<script lang="ts">
	import { fetchApi } from "$lib/api";
	import { onMount } from "svelte";
	import { RefreshCw, AlertTriangle, CheckCircle2, Download, FileJson, FileSpreadsheet } from "lucide-svelte";
	import { refreshTrigger } from "$lib/jmcs";

	// Components
	import AuditStats from "$lib/components/audit/AuditStats.svelte";
	import AuditFilters from "$lib/components/audit/AuditFilters.svelte";
	import AuditItem from "$lib/components/audit/AuditItem.svelte";

	let auditData: any = $state(null);
	let loading = $state(true);
	let errorMessage = $state("");

	// Filters
	let searchQuery = $state("");
	let selectedIssueType = $state("");
	let selectedPlatform = $state("");
	let selectedStatus = $state("unhealthy");

	onMount(async () => {
		await load();
	});

	$effect(() => {
		if ($refreshTrigger) load();
	});

	async function load() {
		try {
			loading = true;
			errorMessage = "";
			const res = await fetchApi<any>("/songdb/v1/audit");
			auditData = res;
		} catch (e: any) {
			errorMessage = e.message || "Failed to fetch audit data.";
		} finally {
			loading = false;
		}
	}

	let filteredResults = $derived(
		auditData?.results?.filter((s: any) => {
			const matchesSearch =
				s.mapName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				s.title.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesType =
				!selectedIssueType ||
				s.issues.some((i: any) => i.type === selectedIssueType);
			const matchesPlatform =
				!selectedPlatform ||
				s.issues.some((i: any) => i.platform === selectedPlatform);

			const matchesStatus =
				!selectedStatus ||
				(selectedStatus === "healthy" && s.issues.length === 0) ||
				(selectedStatus === "unhealthy" && s.issues.length > 0);

			return matchesSearch && matchesType && matchesPlatform && matchesStatus;
		}) || [],
	);

	let uniqueIssueTypes = $derived([
		...new Set(
			auditData?.results?.flatMap((s: any) =>
				s.issues.map((i: any) => i.type),
			) || [],
		),
	] as string[]);

	let uniquePlatforms = $derived([
		...new Set(
			auditData?.results?.flatMap((s: any) =>
				s.issues.map((i: any) => i.platform).filter(Boolean),
			) || [],
		),
	] as string[]);

	function exportJson() {
		if (!filteredResults.length) return;
		const data = JSON.stringify(filteredResults, null, 2);
		const blob = new Blob([data], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `audit-export-${new Date().toISOString().split("T")[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function exportCsv() {
		if (!filteredResults.length) return;
		const headers = ["Map Name", "Title", "Issue Count", "Issues"];
		const rows = filteredResults.map((s: any) => [
			s.mapName,
			s.title,
			s.issues.length,
			s.issues
				.map(
					(i: any) =>
						`${i.type}${i.platform ? ` (${i.platform})` : ""}: ${i.message}`,
				)
				.join("; "),
		]);

		const csvContent = [
			headers.join(","),
			...rows.map((row) =>
				row
					.map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
					.join(","),
			),
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `audit-export-${new Date().toISOString().split("T")[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="space-y-8 max-w-[1600px] mx-auto pb-12">
	<!-- Header Section -->
	<div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
		<div class="space-y-1">
			<h1 class="text-4xl font-black text-white tracking-tight">
				Song Audit
			</h1>
			<p class="text-slate-400 text-sm max-w-xl">
				Comprehensive database integrity check identifying missing
				assets, broken URLs, and inconsistent SKU mappings across all
				platforms.
			</p>
		</div>

		<div class="flex items-center gap-3">
			<div
				class="flex items-center bg-slate-800 border border-slate-700 rounded-xl overflow-hidden"
			>
				<button
					onclick={exportJson}
					class="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-700 text-slate-300 hover:text-white transition-all font-semibold text-xs border-r border-slate-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={!filteredResults.length}
					title="Export JSON"
				>
					<FileJson class="w-3.5 h-3.5" />
					JSON
				</button>
				<button
					onclick={exportCsv}
					class="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-700 text-slate-300 hover:text-white transition-all font-semibold text-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={!filteredResults.length}
					title="Export CSV"
				>
					<FileSpreadsheet class="w-3.5 h-3.5" />
					CSV
				</button>
			</div>

			<button
				onclick={load}
				class="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-semibold text-sm border border-indigo-500/50 active:scale-95 group shadow-lg shadow-indigo-500/10"
				disabled={loading}
			>
				<RefreshCw
					class="w-4 h-4 {loading
						? 'animate-spin'
						: 'group-hover:rotate-180 transition-transform duration-500'}"
				/>
				{loading ? "Analyzing..." : "Re-Run Audit"}
			</button>
		</div>
	</div>

	{#if loading && !auditData}
		<div class="space-y-8">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				{#each Array(3) as _}
					<div
						class="h-28 bg-slate-800/40 animate-pulse rounded-2xl border border-slate-800"
					></div>
				{/each}
			</div>
			<div
				class="h-16 bg-slate-800/40 animate-pulse rounded-xl border border-slate-800"
			></div>
			<div class="space-y-3">
				{#each Array(5) as _}
					<div
						class="h-24 bg-slate-800/40 animate-pulse rounded-xl border border-slate-800"
					></div>
				{/each}
			</div>
		</div>
	{:else if errorMessage}
		<div
			class="bg-red-500/5 border border-red-500/20 rounded-2xl p-12 text-center backdrop-blur-sm"
		>
			<div
				class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6"
			>
				<AlertTriangle class="w-8 h-8 text-red-500" />
			</div>
			<h3 class="text-2xl font-bold text-white mb-2">
				Audit Synchronization Failed
			</h3>
			<p class="text-slate-400 text-sm mb-8 max-w-md mx-auto">
				{errorMessage}
			</p>
			<button
				onclick={load}
				class="bg-white text-black hover:bg-slate-200 px-8 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
			>
				Try Again
			</button>
		</div>
	{:else if auditData}
		<AuditStats
			totalSongs={auditData.totalSongs}
			songsWithIssues={auditData.songsWithIssues}
		/>

		<div class="space-y-4">
			<AuditFilters
				bind:searchQuery
				bind:selectedIssueType
				bind:selectedPlatform
				bind:selectedStatus
				issueTypes={uniqueIssueTypes}
				platforms={uniquePlatforms}
			/>

			<div
				class="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm"
			>
				<table class="w-full text-sm border-collapse">
					<thead>
						<tr
							class="bg-slate-800/30 text-slate-500 text-[10px] uppercase tracking-widest font-bold"
						>
							<th class="p-5 text-left border-b border-slate-800"
								>Song Database Entry</th
							>
							<th class="p-5 text-left border-b border-slate-800"
								>Audit Reports & Findings</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-800/20">
						{#each filteredResults as song}
							<AuditItem {song} />
						{:else}
							<tr>
								<td colspan="2" class="p-20 text-center">
									<div
										class="flex flex-col items-center gap-4"
									>
										{#if searchQuery || selectedIssueType || selectedPlatform}
											<div
												class="p-4 bg-slate-800/50 rounded-full"
											>
												<AlertTriangle
													class="w-8 h-8 text-slate-600"
												/>
											</div>
											<div class="space-y-1">
												<p
													class="text-white font-bold text-lg"
												>
													No matches found
												</p>
												<p
													class="text-slate-500 text-xs"
												>
													Adjust your filters to see
													more results.
												</p>
											</div>
										{:else}
											<div
												class="p-4 bg-green-500/10 rounded-full"
											>
												<CheckCircle2
													class="w-8 h-8 text-green-500"
												/>
											</div>
											<div class="space-y-1">
												<p
													class="text-white font-bold text-lg"
												>
													All Systems Nominal
												</p>
												<p
													class="text-slate-500 text-xs"
												>
													No issues were detected in
													the current database audit.
												</p>
											</div>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		background-image: radial-gradient(
				circle at top right,
				rgba(79, 70, 229, 0.05),
				transparent 40%
			),
			radial-gradient(
				circle at bottom left,
				rgba(220, 38, 38, 0.03),
				transparent 30%
			);
	}
</style>
