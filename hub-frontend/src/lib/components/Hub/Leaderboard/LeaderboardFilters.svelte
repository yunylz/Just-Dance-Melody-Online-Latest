<script>
	import { Search, Filter } from "lucide-svelte";

	export let searchQuery;
	export let selectedPlatform;
	export let clearFilters;
	export let platforms; // Use the platforms prop passed from +page.svelte

	// Set default selectedPlatform to platforms[0] if not already set
	$: if (!selectedPlatform && platforms?.length > 0) {
		selectedPlatform = platforms[0];
	}
</script>

<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6">
	<div class="flex flex-col lg:flex-row gap-6">
		<!-- Search Bar -->
		<div class="flex-1">
			<div class="relative">
				<Search class="absolute z-10 left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
				<input 
					type="text" 
					placeholder="Search players..." 
					bind:value={searchQuery}
					class="w-full pl-12 pr-4 py-3 bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all duration-300"
				/>
			</div>
		</div>

		<!-- Platform Filter -->
		<div class="relative">
			<select 
				bind:value={selectedPlatform}
				class="appearance-none bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl px-4 py-3 pr-10 text-white focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all duration-300"
			>
				{#each platforms as platform}
					<option value={platform}>{platform.name}</option>
				{/each}
			</select>
			<Filter class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
		</div>

		<!-- Clear Filters -->
		{#if selectedPlatform?.id !== 'all' || searchQuery}
			<button 
				on:click={clearFilters}
				class="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-xl text-red-400 text-sm font-medium transition-all duration-200 hover:scale-105"
			>
				Clear Filters
			</button>
		{/if}
	</div>
</div>