<script lang="ts">
	import { Music, AlertTriangle, CheckCircle2 } from "lucide-svelte";

	let { totalSongs, songsWithIssues } = $props();
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
	<div
		class="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex items-center gap-5 transition-all hover:bg-slate-800/50"
	>
		<div class="p-4 bg-indigo-500/10 rounded-xl">
			<Music class="w-8 h-8 text-indigo-400" />
		</div>
		<div>
			<div class="text-3xl font-bold text-white tracking-tight">
				{totalSongs}
			</div>
			<div
				class="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5"
			>
				Total Songs
			</div>
		</div>
	</div>

	<div
		class="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex items-center gap-5 transition-all hover:bg-slate-800/50"
	>
		<div class="p-4 bg-red-500/10 rounded-xl">
			<AlertTriangle class="w-8 h-8 text-red-400" />
		</div>
		<div>
			<div class="text-3xl font-bold text-white tracking-tight">
				{songsWithIssues}
			</div>
			<div
				class="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5"
			>
				Songs with Issues
			</div>
		</div>
	</div>

	<div
		class="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex items-center gap-5 transition-all hover:bg-slate-800/50"
	>
		<div class="p-4 bg-green-500/10 rounded-xl">
			<CheckCircle2 class="w-8 h-8 text-green-400" />
		</div>
		<div>
			<div class="text-3xl font-bold text-white tracking-tight">
				{totalSongs - songsWithIssues}
			</div>
			<div
				class="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5"
			>
				Healthy Songs
			</div>
		</div>
	</div>
</div>
