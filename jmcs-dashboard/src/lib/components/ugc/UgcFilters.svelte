<script lang="ts">
	import { Film, Clock, Flag } from "lucide-svelte";
	import { UGC_TYPES } from "./ugc-constants";

	interface Props {
		activeView: "all" | "pending" | "reported";
		activeTypeFilter: string;
		pendingCount: number;
		reportedCount: number;
		onViewChange: (view: "all" | "pending" | "reported") => void;
		onTypeChange: (type: string) => void;
	}

	let {
		activeView,
		activeTypeFilter,
		pendingCount,
		reportedCount,
		onViewChange,
		onTypeChange,
	}: Props = $props();

	const viewTabs = [
		{ id: "all" as const, label: "All", icon: Film, count: () => 0 },
		{ id: "pending" as const, label: "Pending", icon: Clock, count: () => pendingCount },
		{ id: "reported" as const, label: "Reported", icon: Flag, count: () => reportedCount },
	];

	const typeOptions = [
		{ value: "", label: "All Types" },
		...Object.entries(UGC_TYPES).map(([k, v]) => ({ value: k, label: v.label })),
	];
</script>

<div class="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
	<div class="flex flex-wrap items-center gap-3 p-4">
		<!-- View Tabs -->
		<div class="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
			{#each viewTabs as tab}
				<button
					onclick={() => onViewChange(tab.id)}
					class="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all {activeView === tab.id
						? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
						: 'text-slate-500 hover:text-slate-300'}"
				>
					<svelte:component this={tab.icon} class="w-3.5 h-3.5" />
					{tab.label}
					{#if tab.count() > 0}
						<span class="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-md text-[10px] {activeView === tab.id ? 'bg-indigo-500/30 text-white' : ''}">
							{tab.count()}
						</span>
					{/if}
				</button>
			{/each}
		</div>

		<div class="w-px h-6 bg-slate-800"></div>

		<!-- Type Filter -->
		<div class="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
			{#each typeOptions as opt}
				<button
					onclick={() => onTypeChange(opt.value)}
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all {activeTypeFilter === opt.value
						? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
						: 'text-slate-500 hover:text-slate-300'}"
				>
					{opt.label}
				</button>
			{/each}
		</div>
	</div>
</div>
