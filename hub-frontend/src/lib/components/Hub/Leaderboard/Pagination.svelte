<script>
	export let currentPage;
	export let totalPages;
	export let goToPage;
</script>

{#if totalPages > 1}
	<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6">
		<div class="flex items-center justify-between">
			<button
				on:click={() => goToPage(currentPage - 1)}
				disabled={currentPage === 1}
				class="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-800/50 disabled:opacity-50 border border-gray-600/50 rounded-xl text-white transition-all duration-300 disabled:cursor-not-allowed"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
				</svg>
				Previous
			</button>

			<div class="flex items-center gap-2">
				{#each Array.from({length: totalPages}, (_, i) => i + 1) as page}
					{#if page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)}
						<button
							on:click={() => goToPage(page)}
							class="w-10 h-10 rounded-xl font-medium transition-all duration-300 {currentPage === page ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50 text-gray-300 hover:text-white'}"
						>
							{page}
						</button>
					{:else if page === currentPage - 3 || page === currentPage + 3}
						<span class="text-gray-500">...</span>
					{/if}
				{/each}
			</div>

			<button
				on:click={() => goToPage(currentPage + 1)}
				disabled={currentPage === totalPages}
				class="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-800/50 disabled:opacity-50 border border-gray-600/50 rounded-xl text-white transition-all duration-300 disabled:cursor-not-allowed"
			>
				Next
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
				</svg>
			</button>
		</div>
	</div>
{/if}