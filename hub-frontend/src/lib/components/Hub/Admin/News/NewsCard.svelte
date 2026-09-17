<script>
	import { Edit2, Trash2, Calendar, User, Eye, EyeOff, ImageIcon, ArrowRight } from "lucide-svelte";
	
	export let item;
	export let onSelect;

	function formatDate(dateString) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getCategoryColor(category) {
		switch (category?.toLowerCase()) {
			case 'update': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
			case 'event': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
			case 'maintenance': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
			case 'community': return 'text-green-400 bg-green-500/10 border-green-500/20';
			default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
		}
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
	on:click={onSelect}
	class="group relative bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 hover:border-yellow-500/30 rounded-2xl p-5 transition-all duration-300 cursor-pointer overflow-hidden outline-none focus:outline-none"
>
	<div class="flex items-center justify-between gap-6">
		<div class="flex-1 min-w-0 flex items-center gap-6">
			{#if item.imageUrl}
				<div class="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden shrink-0 border border-gray-700/50 shadow-lg group-hover:scale-105 transition-transform">
					<img src={item.imageUrl} alt={item.title} class="w-full h-full object-cover" />
				</div>
			{:else}
				<div class="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gray-900 border border-gray-700/50 flex items-center justify-center shrink-0">
					<ImageIcon class="w-6 h-6 text-gray-700" />
				</div>
			{/if}

			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-3 mb-2">
					<h3 class="text-xl font-bold text-white truncate group-hover:text-yellow-400 transition-colors">
						{item.title}
					</h3>
					<span class="px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider {getCategoryColor(item.category)}">
						{item.category || 'general'}
					</span>
					{#if !item.published}
						<span class="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-gray-500/20 bg-gray-500/10 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
							<EyeOff class="w-3 h-3" /> Draft
						</span>
					{/if}
				</div>

				<div class="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-gray-500">
					<div class="flex items-center gap-1.5">
						<User class="w-3.5 h-3.5 text-yellow-500/50" />
						<span>{item.author}</span>
					</div>
					<div class="flex items-center gap-1.5">
						<Calendar class="w-3.5 h-3.5 text-yellow-500/50" />
						<span>{formatDate(item.createdAt)}</span>
					</div>
					{#if item.content}
						<div class="hidden md:block truncate max-w-xs italic text-gray-600">
							— {item.content.substring(0, 40)}...
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="flex items-center gap-4">
			<div class="w-10 h-10 bg-gray-900 border border-gray-700 rounded-xl flex items-center justify-center text-gray-600 group-hover:text-yellow-400 group-hover:border-yellow-500/30 group-hover:bg-yellow-500/10 transition-all">
				<ArrowRight class="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
			</div>
		</div>
	</div>
</div>
