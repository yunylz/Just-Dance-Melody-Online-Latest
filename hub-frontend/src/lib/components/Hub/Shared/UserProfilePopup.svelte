<script>
	import { onMount } from 'svelte';
	import { X, Loader2, Users, Gamepad2, Shield, Star, Wrench, Bug, TrendingUp, Zap, Music, Award, Medal, UserPlus, UserCheck, Check } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';
	import API from '$lib/api.js';
	import Avatar from './Avatar.svelte';
	import CountryFlag from '../../CountryFlag.svelte';
	import consoles from '$lib/consoles';
	import { jmcsItems, jmcsAliases } from '$lib/stores/jmcs.js';

	/**
	 * Popup/modal that shows a user's public profile.
	 * @prop {string} userId - The user ID to fetch and display
	 * @prop {Function} onClose - Callback when the popup is dismissed
	 * @prop {'none'|'friend'|'incoming'|'outgoing'} [relationship] - Relationship with the viewed user
	 * @prop {Function} [onSendRequest] - Callback to send a friend request
	 * @prop {Function} [onCancelRequest] - Callback to cancel a friend request
	 */
	export let userId;
	export let onClose = null;
	export let relationship = 'none';
	export let onSendRequest = null;
	export let onCancelRequest = null;

	let friendActionPending = false;

	let profile = null;
	let loading = true;
	let error = false;

	// Keep a local copy so the template re-renders when stores populate
	let items;
	let aliases;
	$: items = $jmcsItems;
	$: aliases = $jmcsAliases;

	onMount(async () => {
		loading = true;
		try {
			profile = await API.getPublicProfile(userId);
			if (!profile) error = true;
		} catch (e) {
			error = true;
		} finally {
			loading = false;
		}
		// Fire-and-forget: these populate the stores, and the $: above
		// will reactively re-render the template when data arrives.
		API.assureItems();
		API.assureAliases();
	});

	function handleBackdropClick(e) {
		if (e.target === e.currentTarget && onClose) {
			onClose();
		}
	}

	function handleKeydown(e) {
		if (e.key === 'Escape' && onClose) {
			onClose();
		}
	}

	$: badges = (() => {
		const list = [];
		if (profile?.isAdmin) list.push({ label: 'Admin', icon: Shield, color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-400/25' });
		if (profile?.isModerator) list.push({ label: 'Mod', icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-400/25' });
		if (profile?.isPatreon) list.push({ label: 'Patreon', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-400/25' });
		if (profile?.isQA) list.push({ label: 'QA', icon: Bug, color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-400/25' });
		return list;
	})();

	function getPlatformTitle(type) {
		return consoles[type]?.title || type || 'Unknown';
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

<svelte:window on:keydown={handleKeydown} />

<!-- Backdrop — fades in on mount -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div
	transition:fade={{ duration: 200 }}
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
	on:click={handleBackdropClick}
	role="dialog"
	aria-modal="true"
	aria-label="User profile"
>
	{#if loading}
		<Loader2 class="w-12 h-12 text-purple-400 animate-spin" />
	{:else if error || !profile}
		<p class="text-gray-400 text-sm">Could not load user profile.</p>
	{:else}
		<div
			transition:scale={{ start: 0.95, duration: 200 }}
			class="relative w-full max-w-3xl max-h-[85vh] bg-gray-800/95 backdrop-blur-xl border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
		>
			<!-- Close button — always visible -->
			<button
				on:click={onClose}
				class="absolute top-4 right-4 z-10 p-2 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50 rounded-xl text-gray-400 hover:text-white transition-all"
			>
				<X class="w-4 h-4" />
			</button>
			<!-- ── HEADER: User info ───────────────────────────────────────────────── -->
			<!-- ── HEADER: User info ───────────────────────────────────────────────── -->
			<div class="shrink-0 bg-gradient-to-b from-purple-500/20 to-transparent px-6 pt-8 pb-5 border-b border-gray-700/50">
				<div class="flex flex-col sm:flex-row sm:items-start gap-5">
					<!-- Avatar -->
					<div class="flex justify-center sm:justify-start shrink-0">
						<Avatar avatar={profile.avatarId} username={profile.username} size="w-20 h-20" />
					</div>

					<!-- Name / status / badges -->
					<div class="flex-1 min-w-0 text-center sm:text-left">
						<h2 class="text-xl font-bold text-white flex items-center justify-center sm:justify-start gap-2">
							{profile.username}
							<CountryFlag countryCode={profile.country} />
						</h2>

						<p class="text-sm text-gray-400 mt-0.5">
							{#if profile.isOnline}
								<span class="text-green-400 font-medium inline-flex items-center gap-1.5">
									<span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
									Online
								</span>
							{:else if profile.lastSeen}
								<span class="text-gray-400">Active {timeAgo(profile.lastSeen)}</span>
							{/if}
						</p>

						{#if badges.length > 0}
							<div class="flex items-center justify-center sm:justify-start gap-2 mt-2.5 flex-wrap">
								{#each badges as badge}
									<div
										class="flex items-center gap-1 px-3 py-1 {badge.bg} border {badge.border} rounded-full text-xs font-semibold {badge.color}"
									>
										<svelte:component this={badge.icon} class="w-3 h-3" />
										{badge.label}
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Stats + friend action -->
					<div class="flex items-center justify-center sm:justify-end gap-5 sm:pl-4 sm:mt-6 sm:border-l border-gray-700/50 shrink-0">
						<div class="flex gap-4">
							<div class="text-center">
								<div class="text-lg font-bold text-blue-400">{profile.friendsCount ?? 0}</div>
								<div class="text-[11px] text-gray-500 uppercase tracking-wider">Friends</div>
							</div>
							<div class="text-center">
								<div class="text-lg font-bold text-purple-400">{profile.profilesCount ?? 0}</div>
								<div class="text-[11px] text-gray-500 uppercase tracking-wider">Profiles</div>
							</div>
						</div>

						{#if relationship === 'friend'}
							<div
								class="flex items-center gap-2 px-3.5 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm font-medium whitespace-nowrap"
							>
								<UserCheck class="w-4 h-4" />
								Friends
							</div>
						{:else if relationship === 'outgoing'}
							<button
								on:click|stopPropagation={async () => {
									if (!onCancelRequest) return;
									friendActionPending = true;
									try {
										await onCancelRequest(userId);
									} finally {
										friendActionPending = false;
									}
								}}
								disabled={friendActionPending}
								class="flex items-center gap-2 px-4 py-2 bg-gray-600/30 hover:bg-red-500/20 border border-gray-500/30 hover:border-red-400/30 rounded-xl text-gray-400 hover:text-red-400 text-sm font-medium transition-all whitespace-nowrap"
							>
								{#if friendActionPending}
									<Loader2 class="w-4 h-4 animate-spin" />
								{:else}
									<X class="w-4 h-4" />
								{/if}
								Cancel Request
							</button>
						{:else if relationship === 'incoming'}
							<div class="flex gap-2">
								<button
									class="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/35 border border-green-400/30 rounded-xl text-green-300 text-sm font-medium transition-all whitespace-nowrap"
								>
									<Check class="w-4 h-4" />
									Accept
								</button>
								<button
									class="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium transition-all whitespace-nowrap"
								>
									<X class="w-4 h-4" />
									Decline
								</button>
							</div>
						{:else if onSendRequest}
							<button
								on:click|stopPropagation={async () => {
									if (!onSendRequest) return;
									friendActionPending = true;
									try {
										await onSendRequest(userId);
									} finally {
										friendActionPending = false;
									}
								}}
								disabled={friendActionPending}
								class="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/40 border border-purple-400/30 rounded-xl text-purple-300 text-sm font-medium transition-all whitespace-nowrap"
							>
								{#if friendActionPending}
									<Loader2 class="w-4 h-4 animate-spin" />
								{:else}
									<UserPlus class="w-4 h-4" />
								{/if}
								Add Friend
							</button>
						{/if}
					</div>
				</div>
			</div>

			<!-- ── BODY: JMCS Profiles (single shared scroll area) ────────────────── -->
			<div class="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
				<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
					<Gamepad2 class="w-4 h-4 text-purple-400" />
					Connected Platforms
					<span class="text-xs text-gray-500 font-normal">({profile.jmcsProfiles?.length ?? 0})</span>
				</h3>

				{#if profile.jmcsProfiles?.length > 0}
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{#each profile.jmcsProfiles as jmcsProfile}
							{@const s = jmcsProfile.stats || {}}
							{@const _border = (items?.portraitBorders || []).find(b => b.id?.toString() === jmcsProfile.portraitBorder?.toString())}
							{@const pBorder = { background: _border?.backgroundUrl || null, foreground: _border?.foregroundUrl || null }}
							{@const _alias = (aliases || []).find(a => a.id?.toString() === jmcsProfile.alias?.toString())}
							{@const pAlias = _alias?.stringOnlineLocalized || _alias?.stringPlaceholder || null}
							<div
								class="bg-gray-700/40 border border-gray-600/40 rounded-xl overflow-hidden"
							>
								<!-- Platform header -->
								<div class="p-3 flex items-center gap-3 border-b border-gray-600/30">
									<div class="relative w-11 h-11 shrink-0">
										{#if pBorder.background}
											<img src={pBorder.background} alt="" class="absolute inset-0 w-full h-full object-cover rounded-lg" />
										{/if}
										<img
											src={API.getAvatarUrl(jmcsProfile.avatar)}
											alt=""
											class="relative w-full h-full object-cover rounded-lg bg-gray-600/50"
										/>
										{#if pBorder.foreground}
											<img src={pBorder.foreground} alt="" class="absolute inset-0 w-full h-full object-cover rounded-lg pointer-events-none" />
										{/if}
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="font-semibold text-white text-sm">{jmcsProfile.nickname}</span>
											<CountryFlag countryId={jmcsProfile.country} />
										</div>
										<span class="text-xs text-gray-500">
											<!-- JD {s.version || '?'} —  -->
											{getPlatformTitle(jmcsProfile.platformType)}
											{#if pAlias}
												<span class="text-gray-600 mx-1">·</span>
												<span class="text-purple-300/70">{pAlias}</span>
											{/if}
										</span>
									</div>
								</div>

								<!-- Stats row -->
								<div class="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
									{#if s.reputationScore != null}
										<div class="flex items-center gap-1.5 text-xs">
											<Zap class="w-3.5 h-3.5 text-pink-400 shrink-0" />
											<span class="text-pink-300 font-semibold">{s.reputationScore.toLocaleString()}</span>
											<span class="text-gray-500">rep</span>
										</div>
									{/if}
									{#if s.totalStars != null}
										<div class="flex items-center gap-1.5 text-xs">
											<Star class="w-3.5 h-3.5 text-yellow-400 shrink-0" />
											<span class="text-yellow-400 font-semibold">{s.totalStars}</span>
										</div>
									{/if}
									{#if s.averageScore != null}
										<div class="flex items-center gap-1.5 text-xs">
											<TrendingUp class="w-3.5 h-3.5 text-green-400 shrink-0" />
											<span class="text-green-400 font-semibold">{(s.averageScore * 100).toFixed(1)}%</span>
										</div>
									{/if}
									{#if s.songsPlayed != null}
										<div class="flex items-center gap-1.5 text-xs">
											<Music class="w-3.5 h-3.5 text-blue-400 shrink-0" />
											<span class="text-blue-300 font-semibold">{s.songsPlayed}</span>
											<span class="text-gray-500">played</span>
										</div>
									{/if}
									{#if s.unlocks != null}
										<div class="flex items-center gap-1.5 text-xs">
											<Award class="w-3.5 h-3.5 text-purple-400 shrink-0" />
											<span class="text-purple-300 font-semibold">{s.unlocks}</span>
											<span class="text-gray-500">unlocks</span>
										</div>
									{/if}
									{#if s.bestScore != null}
										<div class="flex items-center gap-1.5 text-xs">
											<Medal class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
											<span class="text-emerald-300 font-semibold">{(s.bestScore * 100).toFixed(1)}%</span>
										</div>
									{/if}
									{#if s.points != null}
										<div class="flex items-center gap-1.5 text-xs">
											<TrendingUp class="w-3.5 h-3.5 text-cyan-400 shrink-0" />
											<span class="text-cyan-300 font-semibold">{s.points.toLocaleString()}</span>
											<span class="text-gray-500">pts</span>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-gray-500 text-sm text-center py-4">No connected platforms.</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 5px;
	}

	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(168, 85, 247, 0.3);
		border-radius: 999px;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(168, 85, 247, 0.5);
	}
</style>