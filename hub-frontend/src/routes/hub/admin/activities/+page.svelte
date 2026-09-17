<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { 
		Zap, 
		UserX, 
		UserCheck, 
		Trash2, 
		Unlink, 
		ShieldCheck, 
		Shield, 
		Heart, 
		HeartOff, 
		Activity,
		Loader2
	} from 'lucide-svelte';
	import API from '$lib/api.js';
	import Utils from '$lib/utils';
	import ActivitiesHeader from '$lib/components/Hub/Admin/Activities/ActivitiesHeader.svelte';
	import ActivityCard from '$lib/components/Hub/Admin/Activities/ActivityCard.svelte';

	let activities = [];
	let loading = true;
	let searchTerm = '';
	let expandedId = null;

	const actionMap = {
		'SET_JMCS_ENV': { label: 'Environment Change', icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10' },
		'BAN_USER': { label: 'User Banned', icon: UserX, color: 'text-red-400', bg: 'bg-red-500/10' },
		'UNBAN_USER': { label: 'User Unbanned', icon: UserCheck, color: 'text-green-400', bg: 'bg-green-500/10' },
		'DELETE_USER': { label: 'User Deleted', icon: Trash2, color: 'text-red-500', bg: 'bg-red-600/10' },
		'UNLINK_PROFILE': { label: 'Profile Unlinked', icon: Unlink, color: 'text-orange-400', bg: 'bg-orange-500/10' },
		'ADD_TO_QA': { label: 'Added to QA', icon: ShieldCheck, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
		'REMOVE_FROM_QA': { label: 'Removed from QA', icon: Shield, color: 'text-gray-400', bg: 'bg-gray-500/10' },
		'ADD_TO_PATREON': { label: 'Added to Patreon', icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10' },
		'REMOVE_FROM_PATREON': { label: 'Removed from Patreon', icon: HeartOff, color: 'text-gray-400', bg: 'bg-gray-500/10' },
	};

	async function fetchActivities() {
		loading = true;
		try {
			activities = await API.getActivities();
		} catch (error) {
			console.error('Failed to fetch activities:', error);
		} finally {
			loading = false;
		}
	}

	onMount(fetchActivities);

	$: filteredActivities = activities.filter(a => 
		a.adminUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
		a.targetUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
		a.action.toLowerCase().includes(searchTerm.toLowerCase())
	);

	function toggleExpand(id) {
		expandedId = expandedId === id ? null : id;
	}
</script>

<svelte:head>
	<title>{Utils.getTitle("Activity Log", true)}</title>
</svelte:head>

<div class="relative min-h-screen overflow-hidden">
	<!-- Background Effects -->
	<div class="absolute top-24 left-16 w-36 h-36 bg-pink-500/8 rounded-full blur-3xl animate-pulse"></div>
	<div class="absolute top-80 right-24 w-32 h-32 bg-purple-500/8 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
	
	<div class="relative z-10 p-8 space-y-8">
		<ActivitiesHeader bind:searchTerm />

		{#if loading}
			<div class="flex flex-col items-center justify-center py-20 gap-4">
				<Loader2 class="w-10 h-10 text-purple-500 animate-spin" />
				<p class="text-gray-400 font-medium">Fetching logs...</p>
			</div>
		{:else if filteredActivities.length === 0}
			<div class="bg-gray-800/30 border border-gray-700/50 rounded-3xl p-20 text-center" in:fade>
				<div class="w-20 h-20 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-6">
					<Activity class="w-10 h-10 text-gray-500" />
				</div>
				<h3 class="text-xl font-bold text-white mb-2">No activities found</h3>
				<p class="text-gray-400">We couldn't find any activities matching your search.</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each filteredActivities as activity (activity._id)}
					<ActivityCard 
						{activity} 
						{expandedId} 
						{toggleExpand} 
						{actionMap} 
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.animation-delay-2000 { animation-delay: 2s; }
</style>
