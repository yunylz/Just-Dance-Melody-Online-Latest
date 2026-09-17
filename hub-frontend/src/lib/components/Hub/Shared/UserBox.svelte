<script>
	import {
		UserCheck,
		UserPlus,
		UserMinus,
		X,
		Check,
		Loader2,
		Crown
	} from 'lucide-svelte';
	import Avatar from './Avatar.svelte';
	import CountryFlag from '../../CountryFlag.svelte';
	import consoles from '$lib/consoles';

	/**
	 * Shared user card component for displaying a player with actions.
	 *
	 * @prop {Object} user - User object with userId, username, avatarId, country, isOnline, lastSeen, platforms[]
	 * @prop {'none'|'friend'|'incoming'|'outgoing'} relationship - Relationship state
	 * @prop {Object} actionPending - { [userId]: boolean } — loading state per user
	 * @prop {Function} onAdd - Callback when "Add" is clicked
	 * @prop {Function} onAccept - Callback when "Accept" is clicked
	 * @prop {Function} onDecline - Callback when "Decline" is clicked
	 * @prop {Function} onCancel - Callback when "Cancel Request" is clicked
	 * @prop {Function} onRemove - Callback when "Remove" is clicked
	 * @prop {Function} onClick - Callback when the card is clicked (to view profile)
	 * @prop {boolean} [compact] - Compact mode (no platforms)
	 */
	export let user;
	export let relationship = 'none';
	export let actionPending = {};
	export let onAdd = null;
	export let onAccept = null;
	export let onDecline = null;
	export let onCancel = null;
	export let onRemove = null;
	export let onClick = null;
	export let compact = false;
	export let isPatreon = false;
	export let isCurrentUser = false;

	$: isFriend = relationship === 'friend';
	$: isPatreonUser = isPatreon || user?.isPatreon;

	function handleClick(e) {
		if (onClick && !e.target.closest('button')) {
			onClick(user.userId);
		}
	}

	function getPlatformLabel(p) {
		return consoles[p.platformType]?.title || p.platformType || '';
	}

	function timeAgo(dateString) {
		if (!dateString) return '';
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
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="group bg-gray-700/30 border border-gray-600/40 hover:border-purple-400/40 rounded-2xl p-4 transition-all duration-200 flex items-center gap-4"
	class:cursor-pointer={!!onClick}
	on:click={handleClick}
	on:keydown={(e) => e.key === 'Enter' && handleClick(e)}
	role={onClick ? 'button' : undefined}
	tabindex={onClick ? '0' : undefined}
>
	<slot name="before" />

	<Avatar avatar={user.avatarId} username={user.username} isOnline={user.isOnline} />

	<slot name="info">
		<div class="flex-1 min-w-0 flex flex-col justify-center">
			<div class="flex items-center gap-2 flex-wrap">
				<span class="font-semibold text-white">{user.username}</span>
				<CountryFlag countryCode={user.country} />

				<!-- Badges next to country -->
				{#if isFriend}
					<div class="tooltip tooltip-top z-[999]" data-tip="Friend">
						<UserCheck class="w-4 h-4 text-green-400 shrink-0" />
					</div>
				{/if}
				{#if isPatreonUser}
					<div class="tooltip tooltip-top z-[999]" data-tip="Active Patron">
						<div class="flex items-center justify-center w-[18px] h-[18px] rounded-full bg-black shadow-sm shrink-0">
							<Crown class="w-3 h-3 text-yellow-400" />
						</div>
					</div>
				{/if}
				{#if isCurrentUser}
					<span class="px-1.5 py-0.5 bg-purple-500/20 border border-purple-400/30 rounded-full text-purple-400 text-[10px] font-medium leading-none">You</span>
				{/if}

				<span class="text-[11px] text-gray-500 ml-1">
					{#if user.isOnline}
						<span class="text-green-400 font-medium">Online</span>
					{:else if user.lastSeen}
						Active {timeAgo(user.lastSeen)}
					{/if}
				</span>
			</div>

			{#if !compact && user.platforms?.length}
				<div class="flex gap-1 mt-1 flex-wrap">
					{#each user.platforms as p}
						<span
							class="text-xs px-2 py-0.5 bg-gray-600/50 border border-gray-500/40 rounded-lg text-gray-400"
						>{getPlatformLabel(p)}</span
						>
					{/each}
				</div>
			{/if}
		</div>
	</slot>

	<slot name="actions">
		{#if relationship === 'friend'}
			<div
				class="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm font-medium shrink-0"
			>
				<UserCheck class="w-4 h-4" />
				Friends
			</div>
			{#if onRemove}
				<button
					on:click|stopPropagation={() => onRemove(user.userId)}
					disabled={actionPending[user.userId]}
					class="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 hover:border-red-400/40 rounded-xl text-red-400 text-sm font-medium transition-all duration-200 disabled:opacity-50 shrink-0 opacity-0 group-hover:opacity-100"
				>
					{#if actionPending[user.userId]}
						<Loader2 class="w-4 h-4 animate-spin" />
					{:else}
						<UserMinus class="w-4 h-4" />
					{/if}
					Remove
				</button>
			{/if}
		{:else if relationship === 'incoming'}
			<div class="flex gap-2 shrink-0">
				{#if onAccept}
					<button
						on:click|stopPropagation={() => onAccept(user.userId)}
						disabled={actionPending[user.userId]}
						class="p-2 bg-green-500/20 hover:bg-green-500/35 border border-green-400/30 rounded-xl text-green-300 transition-all"
						title="Accept Request"
					>
						<Check class="w-4 h-4" />
					</button>
				{/if}
				{#if onDecline}
					<button
						on:click|stopPropagation={() => onDecline(user.userId)}
						disabled={actionPending[user.userId]}
						class="p-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 rounded-xl text-red-400 transition-all"
						title="Decline Request"
					>
						<X class="w-4 h-4" />
					</button>
				{/if}
			</div>
		{:else if relationship === 'outgoing'}
			{#if onCancel}
				<button
					on:click|stopPropagation={() => onCancel(user.userId)}
					disabled={actionPending[user.userId]}
					class="flex items-center gap-1.5 px-4 py-2 bg-gray-600/30 hover:bg-red-500/20 border border-gray-500/30 hover:border-red-400/30 rounded-xl text-gray-400 hover:text-red-400 text-sm font-medium transition-all shrink-0"
				>
					{#if actionPending[user.userId]}
						<Loader2 class="w-4 h-4 animate-spin" />
					{:else}
						<X class="w-4 h-4" />
					{/if}
					Cancel Request
				</button>
			{/if}
		{:else if relationship === 'none' || !relationship}
			{#if onAdd}
				<button
					on:click|stopPropagation={() => onAdd(user.userId)}
					disabled={actionPending[user.userId]}
					class="flex items-center gap-1.5 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/40 border border-purple-400/30 rounded-xl text-purple-300 text-sm font-medium transition-all duration-200 disabled:opacity-50 shrink-0"
				>
					{#if actionPending[user.userId]}
						<Loader2 class="w-4 h-4 animate-spin" />
					{:else}
						<UserPlus class="w-4 h-4" />
					{/if}
					Add
				</button>
			{/if}
		{/if}
	</slot>
</div>
