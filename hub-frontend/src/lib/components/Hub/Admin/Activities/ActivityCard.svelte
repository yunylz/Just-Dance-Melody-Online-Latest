<script>
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
		Clock, 
		ChevronDown,
		ChevronUp,
		Info,
		ExternalLink
	} from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	export let activity;
	export let expandedId;
	export let toggleExpand;
	export let actionMap;

	function getActionInfo(action) {
		return actionMap[action] || { label: action, icon: Info, color: 'text-gray-400', bg: 'bg-gray-500/10' };
	}

	function formatTime(timestamp) {
		const date = new Date(timestamp);
		const now = new Date();
		const diff = Math.floor((now - date) / 1000);

		if (diff < 60) return 'Just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
		
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function getFullDate(timestamp) {
		return new Date(timestamp).toLocaleString('en-US', {
			weekday: 'short',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	$: info = getActionInfo(activity.action);
	$: isExpanded = expandedId === activity._id;
</script>

<div 
	class="group bg-gray-800/40 backdrop-blur-xl border border-gray-700/30 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all duration-300"
	in:fade
>
	<div class="p-5 flex flex-col md:flex-row md:items-center gap-5">
		<!-- Action Icon -->
		<div class="w-12 h-12 {info.bg} rounded-xl flex items-center justify-center shrink-0 shadow-inner">
			<svelte:component this={info.icon} class="w-6 h-6 {info.color}" />
		</div>

		<!-- Action Description -->
		<div class="flex-1 space-y-1">
			<div class="flex items-center gap-2 flex-wrap">
				<span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider {info.bg} {info.color} border border-current/20">
					{info.label}
				</span>
				<span class="text-sm text-gray-400 flex items-center gap-1" title={getFullDate(activity.timestamp)}>
					<Clock class="w-3.5 h-3.5" />
					{formatTime(activity.timestamp)}
				</span>
			</div>
			<p class="text-white font-medium">
				<span class="text-purple-400 font-bold">{activity.adminUsername}</span>
				{#if activity.action === 'SET_JMCS_ENV'}
					changed JMCS environment for <span class="text-pink-400 font-bold">{activity.targetUsername}</span> to <span class="uppercase text-blue-400">{activity.details.newEnv}</span>
				{:else if activity.action === 'BAN_USER'}
					banned <span class="text-pink-400 font-bold">{activity.targetUsername}</span>
				{:else if activity.action === 'UNBAN_USER'}
					unbanned <span class="text-pink-400 font-bold">{activity.targetUsername}</span>
				{:else if activity.action === 'DELETE_USER'}
					deleted user <span class="text-pink-400 font-bold">{activity.targetUsername}</span>
				{:else if activity.action === 'UNLINK_PROFILE'}
					unlinked profile for <span class="text-pink-400 font-bold">{activity.targetUsername}</span>
				{:else if activity.action === 'ADD_TO_QA'}
					added <span class="text-pink-400 font-bold">{activity.targetUsername}</span> to QA Team
				{:else if activity.action === 'REMOVE_FROM_QA'}
					removed <span class="text-pink-400 font-bold">{activity.targetUsername}</span> from QA Team
				{:else if activity.action === 'ADD_TO_PATREON'}
					added <span class="text-pink-400 font-bold">{activity.targetUsername}</span> to Patreon list
				{:else if activity.action === 'REMOVE_FROM_PATREON'}
					removed <span class="text-pink-400 font-bold">{activity.targetUsername}</span> from Patreon list
				{:else}
					performed <span class="text-pink-400 font-bold">{activity.action}</span> on <span class="text-white font-bold">{activity.targetUsername || activity.targetId}</span>
				{/if}
			</p>
		</div>

		<!-- Actions -->
		<div class="flex items-center gap-3 shrink-0">
			<button 
				on:click={() => toggleExpand(activity._id)}
				class="p-2.5 hover:bg-gray-700/50 rounded-xl text-gray-400 hover:text-white transition-colors"
			>
				{#if isExpanded}
					<ChevronUp class="w-5 h-5" />
				{:else}
					<ChevronDown class="w-5 h-5" />
				{/if}
			</button>
		</div>
	</div>

	{#if isExpanded}
		<div class="px-5 pb-5 pt-0 border-t border-gray-700/30" in:fly={{ y: -10 }}>
			<div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900/40 p-5 rounded-2xl border border-gray-700/50">
				<div class="space-y-4">
					<h4 class="text-xs font-black text-gray-500 uppercase tracking-widest">Metadata</h4>
					<div class="space-y-2">
						<div class="flex items-center justify-between text-sm">
							<span class="text-gray-400">Admin ID:</span>
							<span class="text-gray-200 font-mono text-xs">{activity.adminId}</span>
						</div>
						<div class="flex items-center justify-between text-sm">
							<span class="text-gray-400">Target ID:</span>
							<span class="text-gray-200 font-mono text-xs">{activity.targetId}</span>
						</div>
						<div class="flex items-center justify-between text-sm">
							<span class="text-gray-400">IP Address:</span>
							<span class="text-gray-200 font-mono text-xs">{activity.ip}</span>
						</div>
						<div class="flex flex-col gap-1 text-sm">
							<span class="text-gray-400">User Agent:</span>
							<span class="text-gray-300 text-[10px] leading-relaxed break-all bg-black/20 p-2 rounded-lg">{activity.userAgent}</span>
						</div>
					</div>
				</div>
				<div class="space-y-4">
					<h4 class="text-xs font-black text-gray-500 uppercase tracking-widest">Details</h4>
					<div class="bg-black/20 p-4 rounded-xl border border-gray-700/30">
						{#if activity.details && Object.keys(activity.details).length > 0}
							<pre class="text-[11px] text-purple-300 font-mono whitespace-pre-wrap">{JSON.stringify(activity.details, null, 2)}</pre>
						{:else}
							<p class="text-sm text-gray-500 italic">No additional details recorded.</p>
						{/if}
					</div>
					<div class="flex gap-2">
						<a 
							href="/hub/admin/users?uid={activity.targetId}"
							class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-xs font-bold transition-all"
						>
							<ExternalLink class="w-3.5 h-3.5" />
							View Target
						</a>
						<a 
							href="/hub/admin/users?uid={activity.adminId}"
							class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-xs font-bold transition-all"
						>
							<ExternalLink class="w-3.5 h-3.5" />
							View Admin
						</a>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
