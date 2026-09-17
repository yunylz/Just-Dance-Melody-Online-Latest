<script>
	import Icon from '@iconify/svelte';
	import { Trophy, Medal, Award, User, Loader2, List, UserCheck, Crown } from 'lucide-svelte';

	import API from '$lib/api.js';
	import Utils from '$lib/utils.js';
	import CountryFlag from '$lib/components/CountryFlag.svelte';
	import UserBox from '$lib/components/Hub/Shared/UserBox.svelte';

	export let loadingLeaderboard;
	export let paginatedData;
	export let onClick;
	export let getRankIcon;
	export let currentPage;
	export let itemsPerPage;
	export let filteredData;
	export let relationshipMap = {};
</script>

<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<h3 class="text-xl font-semibold text-white flex items-center gap-2">
			<List/> Leaderboard
			{#if loadingLeaderboard}
				<Loader2 class="w-5 h-5 text-purple-400 animate-spin" />
			{/if}
		</h3>
		<div class="text-sm text-gray-400">
			Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(
				currentPage * itemsPerPage,
				filteredData.length
			)} of {filteredData.length}
		</div>
		<div class="flex flex-wrap gap-1.5">
			<span class="px-2 py-0.5 bg-gray-500/20 border border-gray-400/30 rounded-lg text-gray-400 text-xs">
				Just Dance 2016 to 2018
			</span>
		</div>
	</div>

	{#if loadingLeaderboard}
		<div class="text-center py-12">
			<Loader2 class="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
			<p class="text-gray-400">Loading leaderboard...</p>
		</div>
	{:else if paginatedData.length === 0}
		<div class="text-center py-8">
			<Trophy class="w-10 h-10 text-gray-600 mx-auto mb-3" />
			<p class="text-gray-400 font-medium mb-1">No players found</p>
			<p class="text-gray-500 text-sm">Try adjusting your search or filters</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each paginatedData as entry}
				{@const rankInfo = getRankIcon(entry.globalRank)}
				{@const playerUser = { userId: entry.userId, username: entry.username, avatarId: entry.avatar, country: null, isOnline: entry.isOnline, lastSeen: entry.lastSeen, platforms: [] }}
				<div class="relative group">
					<UserBox
						user={playerUser}
						onClick={onClick}
						isCurrentUser={entry.isCurrentUser}
						relationship={relationshipMap[entry.userId] ?? 'none'}
					>
						<div slot="before">
							<div class="relative">
								<div
									class="w-12 h-12 bg-gradient-to-r {rankInfo.bg} rounded-xl flex items-center justify-center"
								>
									<svelte:component this={rankInfo.icon} class="w-6 h-6 {rankInfo.color}" />
								</div>
								<div
									class="absolute -top-1 -right-1 w-6 h-6 {entry.globalRank <= 3
										? 'bg-gradient-to-r ' + (rankInfo.color === 'text-yellow-400'
											? 'from-yellow-400 to-yellow-600'
											: rankInfo.color === 'text-gray-300'
												? 'from-gray-300 to-gray-500'
												: 'from-amber-600 to-amber-800')
										: 'bg-gray-600'} rounded-full flex items-center justify-center text-white text-xs font-bold"
								>
									{entry.globalRank}
								</div>
							</div>
						</div>

						<div slot="info" class="flex-1 min-w-0">
							{@const rel = relationshipMap[entry.userId] ?? 'none'}
							<div class="flex items-center gap-2 mb-1">
								<h4 class="font-semibold text-white {entry.isCurrentUser ? 'text-purple-300' : ''}">
									{entry.username}
								</h4>
								<CountryFlag countryId={entry.country?.id || 9627} />
								{#if rel === 'friend'}
									<div class="tooltip tooltip-top z-[999]" data-tip="Friend">
										<UserCheck class="w-4 h-4 text-green-400 shrink-0" />
									</div>
								{/if}
								{#if entry.isCurrentUser}
									<span class="px-2 py-0.5 bg-purple-500/20 border border-purple-400/30 rounded-full text-purple-400 text-xs font-medium">You</span>
								{/if}
							</div>
							<div class="flex items-center gap-2 text-sm text-gray-400">
								<span class="text-white font-semibold">{entry.score.toLocaleString()}</span>
								<span class="{Utils.getStarsColorByScore(entry.score)} font-semibold">{Utils.getStarsByScore(entry.score)}</span>
							</div>
						</div>

						<div slot="actions" class="hidden sm:block">
							<span class="text-4xl">
								<Icon icon={Utils.getPlatformIcon(entry.platform)} inline={true} />
							</span>
						</div>
					</UserBox>

					{#if entry.isCurrentUser}
						<div class="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-2xl pointer-events-none"></div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
