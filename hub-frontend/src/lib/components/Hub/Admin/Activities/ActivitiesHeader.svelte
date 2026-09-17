<script>
	import colors from "$lib/colors";
	import { Activity, Search } from "lucide-svelte";

	export let searchTerm = "";
</script>

<div class="relative">
	<div class="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-3xl blur-xl"></div>
	<div class="relative bg-gray-800/40 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-8">
		<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
			<div class="flex items-center gap-4">
				<div class="relative">
					<div class="w-16 h-16 bg-gradient-to-r {colors.home} rounded-2xl flex items-center justify-center shadow-2xl">
						<Activity class="w-8 h-8 text-white" />
					</div>
					<div class="absolute inset-0 bg-gradient-to-r {colors.home} opacity-20 rounded-2xl blur-lg scale-150"></div>
				</div>
				<div>
					<h1 class="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
						Activity Log
					</h1>
					<p class="text-gray-400 mt-2">Audit trail of staff actions and system changes.</p>
				</div>
			</div>

			<div class="relative group">
				<div class="absolute inset-0 bg-purple-500/10 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
				<div class="relative">
					<Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
					<input 
						type="text" 
						bind:value={searchTerm}
						placeholder="Search activities..."
						class="w-full md:w-80 bg-gray-900/50 border border-gray-700/50 rounded-2xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all duration-300 placeholder-gray-500"
					/>
				</div>
			</div>
		</div>
	</div>
</div>
