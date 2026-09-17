<script>
	import API from '$lib/api.js';
	import CountryFlag from '$lib/components/CountryFlag.svelte';
	import Utils from '$lib/utils.js';
	import {
		Trophy,
		Medal,
		Award,
		Star,
		Users,
		Calendar,
		TrendingUp,
		Eye,
		Heart,
		Zap,
		Music,
		UserCheck
	} from 'lucide-svelte';
	import Icon from '@iconify/svelte';
	import UserBox from '$lib/components/Hub/Shared/UserBox.svelte';

	export let top3Players = [];
	export let onClick = null;
	export let relationshipMap = {};
	export let currentUserId = null;

	function getPlatformIcon(platformId) {
		return Utils.getPlatformIcon(platformId);
	}

	function getRankIcon(rank) {
		if (rank === 1)
			return { icon: Trophy, color: 'text-yellow-400', bg: 'from-yellow-400/20 to-yellow-600/20' };
		if (rank === 2)
			return { icon: Medal, color: 'text-gray-300', bg: 'from-gray-300/20 to-gray-500/20' };
		if (rank === 3)
			return { icon: Award, color: 'text-amber-600', bg: 'from-amber-600/20 to-amber-800/20' };
		return { icon: Star, color: 'text-gray-400', bg: 'from-gray-400/10 to-gray-600/10' };
	}

	function getRankHeight(rank) {
		if (rank === 1) return 'h-32'; // Highest
		if (rank === 2) return 'h-24'; // Second highest
		if (rank === 3) return 'h-20'; // Third highest
		return 'h-16';
	}

	function getRankPosition(rank) {
		if (rank === 1) return 'order-2'; // Center
		if (rank === 2) return 'order-1'; // Left
		if (rank === 3) return 'order-3'; // Right
		return 'order-4';
	}
</script>

{#if top3Players.length > 0}
	<div class="relative">
		<!-- Podium Section -->
		<div
			class="bg-gray-800/50 backdrop-blur-xl border border-pink-500/30 rounded-3xl p-5 md:p-8 mb-6"
		>
			<h2
				class="text-xl md:text-2xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2"
			>
				<Trophy class="w-5 h-5 text-yellow-400" />
				Top Performers
			</h2>

			<!-- Mobile: vertical stack (rank order) -->
			<div class="flex flex-col gap-4 md:hidden">
				{#each [...top3Players].sort((a, b) => a.rank - b.rank) as player}
					{@const rankInfo = getRankIcon(player.rank)}
				{@const playerUser = { userId: player.userId, username: player.username, avatarId: player.avatar, country: player.country, isOnline: player.isOnline, lastSeen: player.lastSeen, platforms: [], isPatreon: false }}
				{@const rel = relationshipMap[player.userId] ?? 'none'}
				<UserBox user={playerUser} {onClick} relationship={rel} isCurrentUser={player.userId === currentUserId}>
						<div slot="before">
							<div
								class="w-10 h-10 bg-gradient-to-r {rankInfo.bg} rounded-full flex items-center justify-center shrink-0"
							>
								<svelte:component this={rankInfo.icon} class="w-5 h-5 {rankInfo.color}" />
							</div>
						</div>
						<div slot="info" class="flex-1 min-w-0">
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2 min-w-0">
									<h4 class="font-bold text-white truncate">{player.username}</h4>
									<CountryFlag countryId={player.country} />
									{#if rel === 'friend'}
										<div class="tooltip tooltip-top z-[999]" data-tip="Friend">
											<UserCheck class="w-4 h-4 text-green-400 shrink-0" />
										</div>
									{/if}
									{#if player.userId === currentUserId}
										<span class="px-1.5 py-0.5 bg-purple-500/20 border border-purple-400/30 rounded-full text-purple-400 text-[10px] font-medium leading-none shrink-0">You</span>
									{/if}
								</div>
								<div
									class="text-lg font-bold shrink-0 {player.rank === 1
										? 'text-yellow-300'
										: player.rank === 2
											? 'text-gray-300'
											: 'text-amber-300'}"
								>
									#{player.rank}
								</div>
							</div>
							<div class="flex items-center gap-2 mt-1 text-xs">
								<Zap class="w-3 h-3 text-pink-400" />
								<span class="text-pink-300 font-semibold">{player.reputationScore.toLocaleString()}</span>
								<Star class="w-3 h-3 text-yellow-400" />
								<span class="text-yellow-400">{player.totalStars}</span>
							</div>
						</div>
					</UserBox>
				{/each}
			</div>

			<!-- Desktop: podium layout -->
			<div class="hidden md:flex justify-center items-end gap-8 mb-8">
				{#each top3Players as player}
					{@const rankInfo = getRankIcon(player.rank)}
					<div class="flex flex-col items-center {getRankPosition(player.rank)}">
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
						<div
							class="relative group mb-4 transform hover:scale-105 transition-all duration-500"
							class:cursor-pointer={!!onClick}
							on:click={() => onClick?.(player.userId)}
							on:keydown={(e) => e.key === 'Enter' && onClick?.(player.userId)}
							role={onClick ? 'button' : undefined}
							tabindex={onClick ? '0' : undefined}
						>
							<div
								class="bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6 hover:border-{player.rank ===
								1
									? 'yellow'
									: player.rank === 2
										? 'gray'
										: 'amber'}-400/50 transition-all duration-300 w-64"
							>
								<div class="absolute -top-3 -right-3 z-10">
									<div
										class="w-12 h-12 bg-gradient-to-r {rankInfo.bg} rounded-full flex items-center justify-center border-4 border-gray-800 {player.rank <=
										3
											? 'spotlight-glow'
											: ''}"
									>
										<svelte:component this={rankInfo.icon} class="w-6 h-6 {rankInfo.color}" />
									</div>
								</div>
								<div class="flex justify-center mb-4">
									<img
										src={API.getAvatarUrl(player.avatar)}
										on:error={(e) => (e.target.src = API.getDefaultAvatar())}
										alt="{player.username} avatar"
										class="w-20 h-20 rounded-full object-cover border-4 border-{player.rank === 1
											? 'yellow'
											: player.rank === 2
												? 'gray'
												: 'amber'}-400/50"
										loading="lazy"
									/>
								</div>
								<div class="text-center mb-4">
									<h3 class="text-xl font-bold text-white mb-1">{player.username} <CountryFlag countryId={player.country} /></h3>
									<div class="flex items-center justify-center gap-2 mb-2">
										<div class="tooltip" data-tip={Utils.getPlatformTitle(player.platform)}>
											<span class="text-4xl"
												><Icon icon={getPlatformIcon(player.platform)} inline={true} /></span
											>
										</div>
									</div>
								</div>
								<div
									class="bg-gradient-to-r from-pink-500/20 to-red-500/20 border border-pink-400/30 rounded-xl p-4 mb-4 text-center"
								>
									<div class="flex items-center justify-center gap-2 mb-1">
										<Zap class="w-5 h-5 text-pink-400" /><span
											class="text-sm font-medium text-pink-400">Reputation Score</span
										>
									</div>
									<div class="text-2xl font-bold text-pink-300">
										{player.reputationScore.toLocaleString()}
									</div>
								</div>
								<div class="grid grid-cols-2 gap-3 text-xs">
									<div class="bg-gray-800/50 rounded-lg p-2 text-center">
										<Star class="w-3 h-3 text-yellow-400 mx-auto mb-1" />
										<div class="text-yellow-400 font-semibold">{player.totalStars}</div>
										<div class="text-gray-400">Stars</div>
									</div>
									<div class="bg-gray-800/50 rounded-lg p-2 text-center">
										<TrendingUp class="w-3 h-3 text-green-400 mx-auto mb-1" />
										<div class="text-green-400 font-semibold">{player.averageScore.toFixed(3)}</div>
										<div class="text-gray-400">Avg</div>
									</div>
									<div class="bg-gray-800/50 rounded-lg p-2 text-center">
										<Music class="w-3 h-3 text-blue-400 mx-auto mb-1" />
										<div class="text-blue-400 font-semibold">{player.songsPlayed}</div>
										<div class="text-gray-400">Songs</div>
									</div>
									<div class="bg-gray-800/50 rounded-lg p-2 text-center">
										<Award class="w-3 h-3 text-purple-400 mx-auto mb-1" />
										<div class="text-purple-400 font-semibold">{player.unlocks}</div>
										<div class="text-gray-400">Unlocks</div>
									</div>
									<div class="bg-gray-800/50 rounded-lg p-2 text-center">
										<Zap class="w-3 h-3 text-orange-400 mx-auto mb-1" />
										<div class="text-orange-400 font-semibold">
											{player.points.toLocaleString()}
										</div>
										<div class="text-gray-400">Points</div>
									</div>
									<div class="bg-gray-800/50 rounded-lg p-2 text-center">
										<Medal class="w-3 h-3 text-emerald-400 mx-auto mb-1" />
										<div class="text-emerald-400 font-semibold">
											{(player.bestScore * 100).toFixed(1)}%
										</div>
										<div class="text-gray-400">Best</div>
									</div>
								</div>
							</div>
						</div>
						<div class="relative">
							<div
								class="w-32 {getRankHeight(player.rank)} bg-gradient-to-t {player.rank === 1
									? 'from-yellow-600/30 to-yellow-400/50 border-yellow-400/50'
									: player.rank === 2
										? 'from-gray-600/30 to-gray-400/50 border-gray-400/50'
										: 'from-amber-700/30 to-amber-500/50 border-amber-500/50'} border-2 rounded-t-xl flex items-end justify-center pb-4"
							>
								<div
									class="text-3xl font-bold {player.rank === 1
										? 'text-yellow-300'
										: player.rank === 2
											? 'text-gray-300'
											: 'text-amber-300'}"
								>
									#{player.rank}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Best Score Highlight -->
			{#if top3Players.length > 0}
				{@const bestPlayer = top3Players.reduce((best, current) =>
					current.bestScore > best.bestScore ? current : best
				)}
				<div
					class="text-center bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-400/30 rounded-xl p-4 mt-5"
				>
					<div class="flex items-center justify-center gap-2 mb-2">
						<TrendingUp class="w-5 h-5 text-emerald-400" />
						<span class="text-emerald-400 font-medium">Highest Score Record</span>
					</div>
					<p class="text-white">
						<span class="font-bold text-emerald-300">{bestPlayer.username}</span>
						holds the record with
						<span class="font-bold text-emerald-300"
							>{(bestPlayer.bestScore * 100).toFixed(2)}%</span
						>
					</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.spotlight-glow {
		animation: pulse-glow 2s ease-in-out infinite alternate;
	}

	@keyframes pulse-glow {
		from {
			box-shadow: 0 0 5px rgba(249, 115, 22, 0.5);
		}
		to {
			box-shadow:
				0 0 20px rgba(249, 115, 22, 0.8),
				0 0 30px rgba(249, 115, 22, 0.4);
		}
	}

	.order-1 {
		order: 1;
	}
	.order-2 {
		order: 2;
	}
	.order-3 {
		order: 3;
	}
	.order-4 {
		order: 4;
	}
</style>
