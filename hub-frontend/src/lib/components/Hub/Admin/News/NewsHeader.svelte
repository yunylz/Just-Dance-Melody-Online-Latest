<script>
	import colors from "$lib/colors";
	import { Newspaper } from "lucide-svelte";
</script>

<div class="relative">
	<div class="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-3xl blur-xl"></div>
	<div class="relative bg-gray-800/40 backdrop-blur-xl border border-yellow-500/20 rounded-3xl p-8">
		<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
			<div class="flex items-center gap-4">
				<div class="relative">
					<div class="w-16 h-16 bg-gradient-to-r {colors.news} rounded-2xl flex items-center justify-center shadow-2xl">
						<Newspaper class="w-8 h-8 text-white" />
					</div>
					<div class="absolute inset-0 bg-gradient-to-r {colors.news} opacity-20 rounded-2xl blur-lg scale-150"></div>
				</div>
				<div>
					<h1 class="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
						Editorial News
					</h1>
					<p class="text-gray-400 mt-2">Manage and publish announcements for the community.</p>
				</div>
			</div>
		</div>
	</div>
</div>
