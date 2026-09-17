<script>
	import { onMount } from 'svelte';
	import { Zap, Loader2, RefreshCw, Activity } from 'lucide-svelte';

	import API from '$lib/api.js';
	import Utils from '$lib/utils.js';
	import ActivityCard from '$lib/components/Hub/Shared/ActivityCard.svelte';
	import JmcsActivitiesHeader from '$lib/components/Hub/Admin/Activities/JmcsActivitiesHeader.svelte';

	let activities = [];
	let isLoading = true;

	async function fetchActivities() {
		isLoading = true;
		try {
			activities = await API.getJmcsActivities();
		} catch (err) {
			console.error('Failed to fetch JMCS activities:', err);
			activities = [];
		} finally {
			isLoading = false;
		}
	}

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

	onMount(fetchActivities);
</script>

<svelte:head>
	<title>{Utils.getTitle('JMCS Activities', true)}</title>
</svelte:head>

<div class="relative min-h-screen overflow-hidden">
	<!-- Ambient blobs -->
	<div class="absolute top-24 left-16 w-36 h-36 bg-purple-500/8 rounded-full blur-3xl animate-pulse"></div>
	<div class="absolute bottom-32 left-1/4 w-28 h-28 bg-blue-500/8 rounded-full blur-3xl animate-pulse"></div>

	<div class="relative z-10 p-4 md:p-8 space-y-6">
		<JmcsActivitiesHeader {isLoading} {fetchActivities} />

		<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6">
			{#if isLoading}
				<div class="space-y-4">
					{#each Array(8) as _}
						<div class="bg-gray-800/50 border border-gray-700/40 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
							<div class="w-12 h-12 bg-gray-700/50 rounded-full flex-shrink-0"></div>
							<div class="flex-1 space-y-2">
								<div class="h-4 bg-gray-700/50 rounded w-1/4"></div>
								<div class="h-3 bg-gray-700/30 rounded w-1/2"></div>
							</div>
						</div>
					{/each}
				</div>
			{:else if activities.length === 0}
				<div class="text-center py-20">
					<Activity class="w-16 h-16 text-gray-700 mx-auto mb-4 opacity-50" />
					<h3 class="text-xl font-semibold text-gray-300 mb-2">No JMCS activity recorded</h3>
					<p class="text-gray-500">Wait for players to perform actions on the server.</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each activities as activity}
						<ActivityCard {activity} {timeAgo} />
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
