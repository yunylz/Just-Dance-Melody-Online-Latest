<script>
	import colors from "$lib/colors";
	import { User } from "lucide-svelte";

</script>

<div class="relative">
	<div class="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-3xl blur-xl"></div>
	<div class="relative bg-gray-800/40 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-8">
		<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
			<div class="flex items-center gap-4">
				<div class="relative">
					<div class="w-16 h-16 bg-gradient-to-r {colors.users} rounded-2xl flex items-center justify-center shadow-2xl">
						<User class="w-8 h-8 text-white" />
					</div>
					<div class="absolute inset-0 bg-gradient-to-r {colors.users} opacity-20 rounded-2xl blur-lg scale-150"></div>
				</div>
				<div>
					<h1 class="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
						Users
					</h1>
					<p class="text-gray-400 mt-2">View all users, ban/unban users, and manage user profiles!</p>
				</div>
			</div>

			<!-- <div class="flex gap-4">
				<div class="bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl px-4 py-3 text-center">
					<div class="text-2xl font-bold text-yellow-400">{filteredData.length}</div>
					<div class="text-xs text-gray-400">Players</div>
				</div>
				{#if currentUserRank}
					<div class="bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl px-4 py-3 text-center">
						<div class="text-2xl font-bold text-green-400">#{currentUserRank}</div>
						<div class="text-xs text-gray-400">Your Rank</div>
					</div>
				{/if}
			</div> -->
		</div>
	</div>
</div>