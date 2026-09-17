<script>
	import colors from "$lib/colors";
	import { Zap, RefreshCw } from "lucide-svelte";

	export let isLoading = false;
	export let fetchActivities;
</script>

<div class="relative">
	<div class="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-3xl blur-xl"></div>
	<div class="relative bg-gray-800/40 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-8">
		<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
			<div class="flex items-center gap-4">
				<div class="relative">
					<div class="w-16 h-16 bg-gradient-to-r {colors.home} rounded-2xl flex items-center justify-center shadow-2xl">
						<Zap class="w-8 h-8 text-white" />
					</div>
					<div class="absolute inset-0 bg-gradient-to-r {colors.home} opacity-20 rounded-2xl blur-lg scale-150"></div>
				</div>
				<div>
					<h1 class="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
						JMCS Activities
					</h1>
					<p class="text-gray-400 mt-2">Real-time global activity from the JMCS game servers</p>
				</div>
			</div>

			<button
				on:click={fetchActivities}
				disabled={isLoading}
				class="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white font-medium hover:bg-gray-600/50 transition-all disabled:opacity-50 sm:ml-auto"
			>
				<RefreshCw class="w-5 h-5 {isLoading ? 'animate-spin' : ''}" />
				Refresh Feed
			</button>
		</div>
	</div>
</div>
