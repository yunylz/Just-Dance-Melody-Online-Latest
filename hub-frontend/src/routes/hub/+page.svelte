<script>
	import { onMount, onDestroy } from 'svelte';
	import { Music, Users, Radio, TrendingUp, Loader2, Activity, ArrowRight } from 'lucide-svelte';
	import Icon from '@iconify/svelte';

	import API from '$lib/api';
	import Utils from '$lib/utils';
	import HomeHeader from '$lib/components/Hub/Home/HomeHeader.svelte';
	import ActivityCard from '$lib/components/Hub/Shared/ActivityCard.svelte';

	// ── State ────────────────────────────────────────────────────────────────
	let stats = {};
	let activities = [];
	let isLoading = true;
	let timer;

	// ── Time helper ───────────────────────────────────────────────────────────
	function timeAgo(dateString) {
		const date = new Date(dateString);
		const seconds = Math.floor((new Date() - date) / 1000);
		if (seconds < 60) return `${seconds}s ago`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	// ── Fetch ─────────────────────────────────────────────────────────────────
	async function fetchAll() {
		try {
			isLoading = true;
			const [statsData, activitiesData] = await Promise.all([
				API.getStats(),
				API.getFriendActivities()
			]);
			stats = statsData ?? {};
			activities = (activitiesData ?? []).slice(0, 5);
		} catch (err) {
			console.error('Failed to fetch home page data:', err);
			stats = {};
			activities = [];
		} finally {
			isLoading = false;
		}
	}

	async function fetchStats() {
		try {
			const statsData = await API.getStats();
			stats = statsData ?? {};
		} catch (err) {
			console.error('Failed to fetch live stats:', err);
		}
	}

	onMount(async () => {
		await fetchAll();
		timer = setInterval(fetchStats, 5000);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});
</script>

<svelte:head>
	<title>{Utils.getTitle('Home', true)}</title>
</svelte:head>

<div class="relative min-h-screen overflow-hidden">
	<!-- Background blobs -->
	<div class="absolute top-24 left-16 w-36 h-36 bg-pink-500/8 rounded-full blur-3xl animate-pulse"></div>
	<div class="absolute top-80 right-24 w-32 h-32 bg-purple-500/8 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
	<div class="absolute bottom-32 left-1/4 w-28 h-28 bg-blue-500/8 rounded-full blur-3xl animate-pulse animation-delay-4000"></div>

	<div class="relative z-10 p-4 md:p-8 space-y-6 md:space-y-8">
		<HomeHeader />

		<!-- Stats Bar -->
		{#if isLoading}
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
				{#each Array(4) as _}
					<div class="bg-gray-800/50 backdrop-blur-xl border border-gray-700/40 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
						<div class="w-10 h-10 bg-gray-700/50 rounded-xl flex-shrink-0"></div>
						<div class="space-y-2 flex-1">
							<div class="h-5 bg-gray-700/50 rounded w-16"></div>
							<div class="h-3 bg-gray-700/30 rounded w-20"></div>
						</div>
					</div>
				{/each}
			</div>
		{:else if Object.keys(stats).length > 0}
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<!-- Live Now -->
				<div class="bg-gray-800/50 backdrop-blur-xl border border-green-500/20 rounded-2xl p-4 flex items-center gap-3 group hover:border-green-400/40 transition-all duration-300">
					<div class="w-10 h-10 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
						<Radio class="w-5 h-5 text-green-400" />
					</div>
					<div class="min-w-0 flex-1">
						<div class="flex items-center justify-between">
							<div class="text-xl font-bold text-green-400 leading-none">{(stats.livePlayers ?? 0).toLocaleString()}</div>
							<div class="px-1.5 py-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-[10px] text-white font-bold animate-pulse shadow-sm">
								LIVE
							</div>
						</div>
						<div class="text-xs text-gray-400 mt-0.5">Online Players</div>
					</div>
				</div>

				<!-- Songs -->
				<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-4 flex items-center gap-3 group hover:border-purple-400/40 transition-all duration-300">
					<div class="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
						<Music class="w-5 h-5 text-purple-400" />
					</div>
					<div class="min-w-0">
						<div class="text-xl font-bold text-purple-400 leading-none">{(stats.songCount ?? 0).toLocaleString()}</div>
						<div class="text-xs text-gray-400 mt-0.5">Songs</div>
					</div>
				</div>

				<!-- Registered Players -->
				<div class="bg-gray-800/50 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3 group hover:border-blue-400/40 transition-all duration-300">
					<div class="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
						<Users class="w-5 h-5 text-blue-400" />
					</div>
					<div class="min-w-0">
						<div class="text-xl font-bold text-blue-400 leading-none">{(stats.playerCount ?? 0).toLocaleString()}</div>
						<div class="text-xs text-gray-400 mt-0.5">Registered Players</div>
					</div>
				</div>

				<!-- Total Plays -->
				<div class="bg-gray-800/50 backdrop-blur-xl border border-pink-500/20 rounded-2xl p-4 flex items-center gap-3 group hover:border-pink-400/40 transition-all duration-300">
					<div class="w-10 h-10 bg-gradient-to-br from-pink-500/20 to-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
						<TrendingUp class="w-5 h-5 text-pink-400" />
					</div>
					<div class="min-w-0">
						<div class="text-xl font-bold text-pink-400 leading-none">{(stats.songsPlayed ?? 0).toLocaleString()}</div>
						<div class="text-xs text-gray-400 mt-0.5">Total Plays</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Recent Activity Feed -->
		<div class="mt-8">
			<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6">
				<div class="flex items-center justify-between mb-6">
					<h3 class="text-xl font-semibold text-white flex items-center gap-2">
						<Activity class="w-5 h-5 text-purple-400" /> Recent Friend Activity
					</h3>
					
					{#if activities.length > 0}
						<a 
							href="/hub/friends?tab=activity" 
							class="flex items-center gap-2 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors group"
						>
							See All 
							<ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
						</a>
					{/if}
				</div>

				{#if isLoading}
					<!-- Skeleton Loader -->
					<div class="space-y-3">
						{#each Array(3) as _}
							<div class="bg-gray-800/50 backdrop-blur-xl border border-gray-700/40 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
								<div class="w-12 h-12 bg-gray-700/50 rounded-full flex-shrink-0"></div>
								<div class="flex-1 space-y-2">
									<div class="h-4 bg-gray-700/50 rounded w-1/4"></div>
									<div class="h-3 bg-gray-700/30 rounded w-1/2"></div>
								</div>
							</div>
						{/each}
					</div>
				{:else if activities.length > 0}
					<div class="space-y-3">
						{#each activities as activity}
							<ActivityCard {activity} {timeAgo} />
						{/each}
					</div>
				{:else}
					<!-- Empty State -->
					<div class="text-center py-10">
						<Activity class="w-10 h-10 text-gray-600 mx-auto mb-3 opacity-50" />
						<p class="text-gray-500 font-medium">No friend activities yet</p>
						<p class="text-gray-600 text-sm">Activities from your friends will appear here</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.animation-delay-2000 { animation-delay: 2s; }
	.animation-delay-4000 { animation-delay: 4s; }
</style>
