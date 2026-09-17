<script>
	import { onMount } from 'svelte';
	import {
		Bell,
		Megaphone,
		Trash2,
		CheckCheck,
		Loader2,
		UserPlus,
		UserCheck,
		Newspaper,
		RefreshCw,
		Calendar,
		User,
		ChevronRight,
		Check,
		X
	} from 'lucide-svelte';

	import API from '$lib/api.js';
	import Utils from '$lib/utils.js';
	import UpdatesHeader from '$lib/components/Hub/Updates/UpdatesHeader.svelte';
	import { notifications } from '$lib/stores/notifications.js';

	// ── Data ──────────────────────────────────────────────────────────────────
	let news = [];
	let loading = false;
	let hasInitialLoad = false;

	// ── Action states ─────────────────────────────────────────────────────────
	let markingAll = false;
	let clearing = false;
	let actionPending = {}; // { [id]: true }

	// ── Toast ─────────────────────────────────────────────────────────────────
	let toast = null;
	let toastTimeout = null;

	function showToast(message, type = 'success') {
		clearTimeout(toastTimeout);
		toast = { message, type };
		toastTimeout = setTimeout(() => (toast = null), 3000);
	}

	// ── Fetch ─────────────────────────────────────────────────────────────────
	async function fetchData() {
		loading = true;
		try {
			const [newsRes] = await Promise.all([API.getNews(), notifications.fetch()]);
			news = newsRes;
			hasInitialLoad = true;
		} finally {
			loading = false;
		}
	}

	// ── Actions ───────────────────────────────────────────────────────────────
	async function markRead(notif) {
		if (!notif.new) return;
		actionPending = { ...actionPending, [notif.id]: true };
		try {
			await API.markNotificationRead(notif.id);
			notifications.markAsRead(notif.id);
		} catch (e) {
			showToast(e.message || 'Failed to mark as read', 'error');
		} finally {
			actionPending = { ...actionPending, [notif.id]: false };
		}
	}

	async function markAllRead() {
		markingAll = true;
		try {
			await API.markAllNotificationsRead();
			notifications.markAllRead();
			showToast('All notifications marked as read.');
		} catch (e) {
			showToast(e.message || 'Failed to mark all as read', 'error');
		} finally {
			markingAll = false;
		}
	}

	async function clearNotifications() {
		clearing = true;
		try {
			await API.clearNotifications();
			notifications.clear();
			showToast('Social alerts cleared.');
		} catch (e) {
			showToast(e.message || 'Failed to clear notifications', 'error');
		} finally {
			clearing = false;
		}
	}

	async function acceptFriend(notif) {
		const fromUserId = notif.data?.fromUserId;
		if (!fromUserId) return;
		actionPending = { ...actionPending, [notif.id]: true };
		try {
			await API.acceptFriendRequest(fromUserId);
			showToast('Friend request accepted!');
			await markRead(notif);
			await notifications.fetch();
		} catch (e) {
			showToast(e.message || 'Failed to accept', 'error');
		} finally {
			actionPending = { ...actionPending, [notif.id]: false };
		}
	}

	async function declineFriend(notif) {
		const fromUserId = notif.data?.fromUserId;
		if (!fromUserId) return;
		actionPending = { ...actionPending, [notif.id]: true };
		try {
			await API.declineFriendRequest(fromUserId);
			showToast('Request declined.');
			await markRead(notif);
			await notifications.fetch();
		} catch (e) {
			showToast(e.message || 'Failed to decline', 'error');
		} finally {
			actionPending = { ...actionPending, [notif.id]: false };
		}
	}

	// ── Helpers ───────────────────────────────────────────────────────────────
	function formatTime(iso) {
		const d = new Date(iso);
		const now = new Date();
		const diff = now - d;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'Just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		if (days < 7) return `${days}d ago`;
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function getNotifIcon(type) {
		if (type === 'friend_request') return UserPlus;
		if (type === 'friend_accepted') return UserCheck;
		return Bell;
	}

	function getNotifAccent(type) {
		if (type === 'friend_request') return 'from-purple-500 to-pink-500';
		if (type === 'friend_accepted') return 'from-green-500 to-teal-500';
		return 'from-blue-500 to-cyan-500';
	}

	// ── Derived ───────────────────────────────────────────────────────────────
	$: unreadCount = $notifications.filter((n) => n.new).length;

	onMount(fetchData);
</script>

<svelte:head>
	<title>{Utils.getTitle('Updates', true)}</title>
</svelte:head>

<div class="relative min-h-screen overflow-hidden">
	<!-- Ambient blobs -->
	<div
		class="absolute top-24 left-16 w-36 h-36 bg-rose-500/8 rounded-full blur-3xl animate-pulse"
	></div>
	<div
		class="absolute top-80 right-24 w-32 h-32 bg-orange-500/8 rounded-full blur-3xl animate-pulse animation-delay-2000"
	></div>
	<div
		class="absolute bottom-32 left-1/4 w-28 h-28 bg-pink-500/8 rounded-full blur-3xl animate-pulse animation-delay-4000"
	></div>

	<div class="relative z-10 p-4 md:p-8 space-y-8">
		<UpdatesHeader newsCount={news.length} {unreadCount} />

		<div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
			<!-- ── NEWS SECTION (2/3) ─────────────────────────────────────────── -->
			<div class="xl:col-span-2 space-y-6">
				<div class="flex items-center justify-between">
					<h2 class="text-2xl font-bold text-white flex items-center gap-3">
						<div class="p-2 bg-rose-500/20 rounded-xl">
							<Megaphone class="w-6 h-6 text-rose-400" />
						</div>
						Latest News
					</h2>
					<button
						on:click={fetchData}
						disabled={loading}
						class="w-10 h-10 flex items-center justify-center hover:bg-gray-800 rounded-xl transition-all text-gray-400 disabled:opacity-50"
						title="Refresh News"
					>
						<RefreshCw class="w-5 h-5 {loading ? 'animate-spin' : ''}" />
					</button>
				</div>

				<div class="relative min-h-[400px]">
					{#if loading && news.length > 0}
						<!-- Overlay loader for background refresh -->
						<div
							class="absolute inset-0 z-20 bg-gray-900/20 backdrop-blur-[2px] rounded-3xl flex items-center justify-center pointer-events-none transition-all"
						>
							<div
								class="bg-gray-800/90 p-4 rounded-2xl border border-gray-700/50 shadow-2xl scale-110"
							>
								<Loader2 class="w-8 h-8 text-rose-400 animate-spin" />
							</div>
						</div>
					{/if}

					{#if news.length > 0}
						<div class="space-y-6">
							{#each news as item (item.id)}
								<article
									class="group relative bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 hover:border-rose-500/30 rounded-3xl overflow-hidden transition-all duration-300"
								>
									{#if item.imageUrl}
										<div class="aspect-[21/9] w-full overflow-hidden">
											<img
												src={item.imageUrl}
												alt={item.title}
												class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
											/>
										</div>
									{/if}
									<div class="p-6 md:p-8 space-y-4">
										<div class="flex items-center gap-4 text-xs font-medium text-gray-500">
											<span
												class="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20"
											>
												{item.category || 'Announcement'}
											</span>
											<span class="flex items-center gap-1.5">
												<Calendar class="w-3.5 h-3.5" />
												{formatTime(item.createdAt)}
											</span>
											<span class="flex items-center gap-1.5">
												<User class="w-3.5 h-3.5" />
												{item.author}
											</span>
										</div>
										<h3
											class="text-2xl font-bold text-white group-hover:text-rose-400 transition-colors"
										>
											{item.title}
										</h3>
										<p class="text-gray-400 leading-relaxed line-clamp-3">
											{item.content}
										</p>
										<!-- <div class="pt-4 flex items-center justify-between">
											<button class="flex items-center gap-2 text-rose-400 font-semibold hover:text-rose-300 transition-colors group/btn">
												Read More
												<ChevronRight class="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
											</button>
										</div> -->
									</div>
								</article>
							{/each}
						</div>
					{:else if loading}
						<!-- Full spinner for initial load -->
						<div class="absolute inset-0 flex flex-col items-center justify-center space-y-4">
							<Loader2 class="w-12 h-12 text-rose-400 animate-spin" />
							<p class="text-gray-500 animate-pulse">Loading news...</p>
						</div>
					{:else if hasInitialLoad}
						<!-- Empty state -->
						<div
							class="bg-gray-800/40 border border-gray-700/50 rounded-3xl p-12 text-center h-[400px] flex flex-col items-center justify-center"
						>
							<div class="p-6 bg-gray-700/30 rounded-full mb-6">
								<Newspaper class="w-16 h-16 text-gray-400 opacity-50" />
							</div>
							<h3 class="text-xl font-semibold text-gray-300">No news yet</h3>
							<p class="text-gray-500 mt-2">Check back later for announcements.</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- ── NOTIFICATIONS SECTION (1/3) ────────────────────────────────── -->
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<h2 class="text-2xl font-bold text-white flex items-center gap-3">
						<div class="p-2 bg-blue-500/20 rounded-xl">
							<Bell class="w-6 h-6 text-blue-400" />
						</div>
						Alerts
					</h2>
					<div class="flex items-center gap-1">
						<button
							on:click={fetchData}
							disabled={loading}
							class="w-9 h-9 flex items-center justify-center hover:bg-gray-800 rounded-xl transition-all text-gray-400 disabled:opacity-50"
							title="Refresh Alerts"
						>
							<RefreshCw class="w-4 h-4 {loading ? 'animate-spin' : ''}" />
						</button>
						{#if unreadCount > 0}
							<button
								on:click={markAllRead}
								disabled={markingAll}
								class="p-2 hover:bg-purple-500/20 rounded-xl transition-colors text-purple-400"
								title="Mark all as read"
							>
								{#if markingAll}
									<Loader2 class="w-5 h-5 animate-spin" />
								{:else}
									<CheckCheck class="w-5 h-5" />
								{/if}
							</button>
						{/if}
						<button
							on:click={clearNotifications}
							disabled={clearing || $notifications.length === 0}
							class="p-2 hover:bg-red-500/20 rounded-xl transition-colors text-red-400"
							title="Clear alerts"
						>
							{#if clearing}
								<Loader2 class="w-5 h-5 animate-spin" />
							{:else}
								<Trash2 class="w-5 h-5" />
							{/if}
						</button>
					</div>
				</div>

				<div
					class="bg-gray-800/50 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-2 min-h-[400px] relative"
				>
					{#if loading && $notifications.length > 0}
						<div
							class="absolute inset-0 z-20 bg-gray-900/10 backdrop-blur-[1px] rounded-3xl flex items-center justify-center pointer-events-none"
						>
							<div class="bg-gray-800/80 p-3 rounded-xl border border-gray-700/50 shadow-xl">
								<Loader2 class="w-6 h-6 text-blue-400 animate-spin" />
							</div>
						</div>
					{/if}

					{#if $notifications.length > 0}
						<div class="space-y-2 overflow-y-auto max-h-[800px] p-2">
							{#each $notifications as notif (notif.id)}
								{@const Icon = getNotifIcon(notif.type)}
								{@const accent = getNotifAccent(notif.type)}
								<!-- svelte-ignore a11y-click-events-have-key-events -->
								<!-- svelte-ignore a11y-no-static-element-interactions -->
								<div
									on:click={() => markRead(notif)}
									class="relative flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-200 cursor-pointer
										{notif.new
										? 'bg-gray-700/40 border-blue-500/30 hover:border-blue-400/50'
										: 'bg-gray-700/10 border-gray-700/50 opacity-60 hover:opacity-100 hover:bg-gray-700/20'}"
								>
									<div class="flex items-start gap-3">
										<div
											class="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br {accent} flex items-center justify-center shadow-lg"
										>
											<svelte:component this={Icon} class="w-5 h-5 text-white" />
										</div>
										<div class="flex-1 min-w-0">
											<p class="text-sm font-semibold text-white truncate">{notif.title}</p>
											<p class="text-xs text-gray-400 mt-0.5 line-clamp-2">{notif.body}</p>
											<span class="text-[10px] text-gray-500 mt-1 block"
												>{formatTime(notif.time)}</span
											>
										</div>
										{#if actionPending[notif.id]}
											<Loader2 class="w-3.5 h-3.5 text-blue-400 animate-spin mt-1" />
										{:else if notif.new}
											<div class="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
										{/if}
									</div>

									{#if notif.type === 'friend_request' && notif.new}
										<div class="flex gap-2 mt-1">
											<button
												on:click|stopPropagation={() => acceptFriend(notif)}
												disabled={actionPending[notif.id]}
												class="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-green-500/20 hover:bg-green-500/35 border border-green-400/30 rounded-lg text-green-300 text-xs font-medium transition-all"
											>
												<Check class="w-3.5 h-3.5" />
												Accept
											</button>
											<button
												on:click|stopPropagation={() => declineFriend(notif)}
												disabled={actionPending[notif.id]}
												class="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium transition-all"
											>
												<X class="w-3.5 h-3.5" />
												Decline
											</button>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{:else if loading}
						<div class="flex flex-col items-center justify-center py-20 min-h-[380px]">
							<Loader2 class="w-10 h-10 text-blue-400 animate-spin mb-4" />
							<p class="text-gray-500 animate-pulse text-sm">Loading alerts...</p>
						</div>
					{:else if hasInitialLoad}
						<div class="py-20 text-center flex flex-col items-center justify-center min-h-[380px]">
							<div class="p-5 bg-gray-700/30 rounded-full mb-4">
								<Bell class="w-10 h-10 text-gray-400 opacity-50" />
							</div>
							<p class="text-gray-500">No social alerts</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Toast -->
	{#if toast}
		<div
			class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl border backdrop-blur-xl transition-all duration-300
			{toast.type === 'error'
				? 'bg-red-500/20 border-red-400/30 text-red-200'
				: 'bg-green-500/20 border-green-400/30 text-green-200'}"
		>
			{toast.message}
		</div>
	{/if}
</div>

<style>
	.animation-delay-2000 {
		animation-delay: 2s;
	}
	.animation-delay-4000 {
		animation-delay: 4s;
	}
</style>
