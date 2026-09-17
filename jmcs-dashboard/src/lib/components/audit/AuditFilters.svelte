<script lang="ts">
	import { Search, Filter, X } from "lucide-svelte";

	let {
		searchQuery = $bindable(""),
		selectedIssueType = $bindable(""),
		selectedPlatform = $bindable(""),
		selectedStatus = $bindable(""),
		issueTypes = [],
		platforms = [],
	} = $props();

	function clearFilters() {
		searchQuery = "";
		selectedIssueType = "";
		selectedPlatform = "";
		selectedStatus = "";
	}

	const hasActiveFilters = $derived(
		searchQuery !== "" ||
			selectedIssueType !== "" ||
			selectedPlatform !== "" ||
			selectedStatus !== ""
	);
</script>

<div
	class="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800"
>
	<div
		class="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 flex-1 focus-within:border-indigo-500/50 transition-colors"
	>
		<Search class="w-4 h-4 text-slate-400" />
		<input
			bind:value={searchQuery}
			type="text"
			placeholder="Search by title or map name..."
			class="bg-transparent text-sm text-white outline-none w-full placeholder-slate-500"
		/>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<div class="flex items-center gap-2">
			<Filter class="w-4 h-4 text-slate-500" />
			<select
				bind:value={selectedIssueType}
				class="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
			>
				<option value="">All Issue Types</option>
				{#each issueTypes as type}
					<option value={type}
						>{type.replace(/_/g, " ").toUpperCase()}</option
					>
				{/each}
			</select>
		</div>

		<select
			bind:value={selectedStatus}
			class="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
		>
			<option value="">All Statuses</option>
			<option value="unhealthy">With Issues</option>
			<option value="healthy">Healthy Only</option>
		</select>

		<select
			bind:value={selectedPlatform}
			class="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
		>
			<option value="">All Platforms</option>
			{#each platforms as platform}
				<option value={platform}>{platform.toUpperCase()}</option>
			{/each}
		</select>

		{#if hasActiveFilters}
			<button
				onclick={clearFilters}
				class="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1"
			>
				<X class="w-3.5 h-3.5" /> Clear
			</button>
		{/if}
	</div>
</div>
