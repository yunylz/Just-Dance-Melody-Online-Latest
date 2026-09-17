<script lang="ts">
	import IssueBadge from "./IssueBadge.svelte";
	import { ChevronRight } from "lucide-svelte";

	let { song } = $props();
</script>

<tr class="group hover:bg-indigo-500/5 transition-all">
	<td class="p-5 align-top border-b border-slate-800/50">
		<div class="flex items-start gap-4">
			<div class="flex-1 min-w-0">
				<div class="text-white font-bold text-base truncate leading-tight">
					{song.title}
				</div>
				<div
					class="text-xs font-mono text-slate-500 mt-1 flex items-center gap-2"
				>
					<span>{song.mapName}</span>
					<span class="w-1 h-1 rounded-full bg-slate-700"></span>
					{#if song.issues.length > 0}
						<span class="text-slate-600"
							>{song.issues.length} issues</span
						>
					{:else}
						<span class="text-green-500/80 font-bold"
							>Operational</span
						>
					{/if}
				</div>
			</div>
			<a
				href="/songs?mapName={song.mapName}"
				class="p-2 text-slate-600 hover:text-indigo-400 bg-slate-800/0 hover:bg-indigo-400/10 rounded-lg transition-all"
				title="Edit Song"
			>
				<ChevronRight class="w-4 h-4" />
			</a>
		</div>
	</td>
	<td class="p-5 border-b border-slate-800/50">
		<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
			{#each song.issues as issue}
				<IssueBadge {issue} />
			{:else}
				<div
					class="col-span-full flex items-center gap-2 text-green-500/50 text-[10px] font-bold uppercase tracking-widest"
				>
					<div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
					All Integrity Checks Passed
				</div>
			{/each}
		</div>
	</td>
</tr>
