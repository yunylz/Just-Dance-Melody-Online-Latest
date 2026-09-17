<script>
	import API from '$lib/api.js';
	import Utils from '$lib/utils.js';
	import { Users, Star, TrendingUp, Eye, Zap, Music, Trophy, Award, Medal, Loader2, UserCheck } from 'lucide-svelte';
	import Icon from '@iconify/svelte';
	import UserBox from '$lib/components/Hub/Shared/UserBox.svelte';
	import CountryFlag from '$lib/components/CountryFlag.svelte';

	export let tableData;
	export let startRank = 4;
	export let loadingTable = false;
	export let onClick = null;
	export let relationshipMap = {};
	export let currentUserId = null;

	function getPlatformIcon(platformId) {
		return Utils.getPlatformIcon(platformId);
	}
</script>

{#if tableData.length > 0}
	<div class="bg-gray-800/50 backdrop-blur-xl border border-pink-500/30 rounded-3xl p-6">
		<div class="mb-6 flex items-center justify-between">
			<h3 class="text-xl font-semibold text-white flex items-center gap-2">
				<Users class="w-5 h-5 text-pink-400" />
				Featured Players
				{#if loadingTable}
					<Loader2 class="w-5 h-5 text-pink-400 animate-spin" />
				{/if}
			</h3>
			<div class="text-sm text-gray-400">
				Ranks {startRank} - {startRank + tableData.length - 1}
			</div>
		</div>

		<div class="space-y-3">
			{#each tableData as player, index}
			{@const playerUser = { userId: player.userId, username: player.username, avatarId: player.avatar, country: player.country, isOnline: player.isOnline, lastSeen: player.lastSeen, platforms: [], isPatreon: false }}
				<div class="relative group">
					<UserBox
						user={playerUser}
						onClick={onClick}
						relationship={relationshipMap[player.userId] ?? 'none'}
						isCurrentUser={player.userId === currentUserId}
					>
						<!-- Rank badge before avatar -->
						<div slot="before">
							<div
								class="w-12 h-12 bg-gray-600/50 rounded-xl flex items-center justify-center font-bold text-white shrink-0"
							>
								#{startRank + index}
							</div>
						</div>

						<!-- Custom info: spotlight stats instead of default -->
						<div slot="info" class="flex-1 min-w-0">
							{@const rel = relationshipMap[player.userId] ?? 'none'}
							<div class="flex items-center gap-2 mb-1">
								<h4 class="font-semibold text-white">{player.username}</h4>
								<CountryFlag countryId={player.country} />
								{#if rel === 'friend'}
									<div class="tooltip tooltip-top z-[999]" data-tip="Friend">
										<UserCheck class="w-4 h-4 text-green-400 shrink-0" />
									</div>
								{/if}
								{#if player.userId === currentUserId}
									<span class="px-1.5 py-0.5 bg-purple-500/20 border border-purple-400/30 rounded-full text-purple-400 text-[10px] font-medium leading-none">You</span>
								{/if}
							</div>
							<div class="flex flex-wrap items-center gap-2 text-sm text-gray-400">
								<span class="flex items-center gap-1">
									<Zap class="w-4 h-4 text-pink-400" />
									<span class="text-white font-semibold">{player.reputationScore.toLocaleString()}</span>
									<span class="text-pink-400">rep</span>
								</span>
								<span class="flex items-center gap-1">
									<Star class="w-4 h-4 text-yellow-400" />
									<span class="text-yellow-400 font-semibold">{player.totalStars}</span>
								</span>
								<span class="flex items-center gap-1">
									<TrendingUp class="w-4 h-4 text-green-400" />
									<span class="text-green-400 font-semibold">{(player.averageScore * 100).toFixed(1)}%</span>
								</span>
							</div>
						</div>

						<!-- Custom actions: platform icon + stat tooltips -->
						<div slot="actions" class="text-right hidden sm:block">
							<div class="flex items-center gap-2 justify-end mb-2">
								<div class="tooltip" data-tip={Utils.getPlatformTitle(player.platform)}>
									<span class="text-2xl md:text-4xl">
										<Icon icon={getPlatformIcon(player.platform)} inline={true} />
									</span>
								</div>
							</div>
							<div class="flex flex-wrap items-center gap-2 text-xs text-gray-500">
								<div class="tooltip" data-tip="Songs played">
									<span class="flex items-center gap-1">
										<Music class="w-3 h-3" />
										{player.songsPlayed}
									</span>
								</div>
								<div class="tooltip" data-tip="WDF Rank">
									<span class="flex items-center gap-1">
										<Trophy class="w-3 h-3 text-yellow-400" />
										#{player.wdfRank}
									</span>
								</div>
								<div class="tooltip" data-tip="Unlocks">
									<span class="flex items-center gap-1">
										<Award class="w-3 h-3 text-purple-400" />
										{player.unlocks}
									</span>
								</div>
								<div class="tooltip" data-tip="Best Score">
									<span class="flex items-center gap-1">
										<Medal class="w-3 h-3 text-emerald-400" />
										{(player.bestScore * 100).toFixed(1)}%
									</span>
								</div>
								{#if player.autodanceViews > 0}
									<div class="tooltip" data-tip="Autodance views">
										<span class="flex items-center gap-1">
											<Eye class="w-3 h-3 text-cyan-400" />
											{player.autodanceViews}
										</span>
									</div>
								{/if}
							</div>
						</div>
					</UserBox>

					<!-- Hover effect overlay -->
					<div
						class="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
					></div>
				</div>
			{/each}
		</div>
	</div>
{:else}
	<div class="bg-gray-800/50 backdrop-blur-xl border border-orange-500/30 rounded-3xl p-6">
		<div class="text-center py-12">
			<Users class="w-12 h-12 text-gray-400 mx-auto mb-4" />
			<h3 class="text-xl font-semibold text-gray-300 mb-2">No additional players</h3>
			<p class="text-gray-400">Only top 3 players available in spotlight</p>
		</div>
	</div>
{/if}
