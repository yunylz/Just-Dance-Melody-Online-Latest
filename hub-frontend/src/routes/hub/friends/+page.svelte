<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		Users,
		Search,
		Compass,
		UserCheck,
		UserPlus,
		Loader2,
		RefreshCw,
		Activity
	} from 'lucide-svelte';

	import API from '$lib/api.js';
	import Utils from '$lib/utils.js';
	import FriendsHeader from '$lib/components/Hub/Friends/FriendsHeader.svelte';
	import UserBox from '$lib/components/Hub/Shared/UserBox.svelte';
	import UserProfilePopup from '$lib/components/Hub/Shared/UserProfilePopup.svelte';
	import ActivityCard from '$lib/components/Hub/Shared/ActivityCard.svelte';
	import { popupStore } from '$lib/stores/popup';

	// ── Tab state ─────────────────────────────────────────────────────────────
	let activeTab = 'explore'; // 'explore' | 'search' | 'friends' | 'requests'

	// ── Data ──────────────────────────────────────────────────────────────────
	let explorePlayers = [];
	let searchResults = [];
	let friends = [];
	let friendRequests = { incoming: [], outgoing: [] };
	let activities = [];

	// ── Loading ───────────────────────────────────────────────────────────────
	let loadingExplore = false;
	let loadingSearch = false;
	let loadingFriends = false;
	let loadingRequests = false;
	let loadingActivities = false;

	// ── Search ────────────────────────────────────────────────────────────────
	let searchQuery = '';
	let searchDebounce = null;

	// ── Action loading per userId ─────────────────────────────────────────────
	let actionPending = {}; // { [userId]: true }

	// ── Profile popup ─────────────────────────────────────────────────────────
	let selectedUserId = null;

	function openProfile(userId) {
		selectedUserId = userId;
	}

	function closeProfile() {
		selectedUserId = null;
	}

	// ── Fetch helpers ─────────────────────────────────────────────────────────
	async function fetchExplore() {
		loadingExplore = true;
		try {
			explorePlayers = await API.getExplorePlayers();
		} finally {
			loadingExplore = false;
		}
	}

	async function fetchFriends() {
		loadingFriends = true;
		try {
			friends = await API.getFriends();
		} finally {
			loadingFriends = false;
		}
	}

	async function fetchRequests() {
		loadingRequests = true;
		try {
			friendRequests = await API.getFriendRequests();
		} finally {
			loadingRequests = false;
		}
	}

	async function fetchActivities() {
		loadingActivities = true;
		try {
			activities = await API.getFriendActivities();
		} finally {
			loadingActivities = false;
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

	async function doSearch(q) {
		if (!q.trim()) {
			searchResults = [];
			return;
		}
		loadingSearch = true;
		try {
			searchResults = await API.searchPlayers(q.trim());
		} finally {
			loadingSearch = false;
		}
	}

	function onSearchInput() {
		clearTimeout(searchDebounce);
		if (searchQuery.trim()) {
			loadingSearch = true;
		} else {
			loadingSearch = false;
			searchResults = [];
		}
		searchDebounce = setTimeout(() => doSearch(searchQuery), 350);
	}

	// ── Actions ───────────────────────────────────────────────────────────────
	async function sendRequest(userId) {
		actionPending = { ...actionPending, [userId]: true };
		try {
			await API.sendFriendRequest(userId);
			popupStore.add('Friend request sent!', 'success');
			await Promise.all([fetchExplore(), fetchRequests()]);
			if (activeTab === 'search') await doSearch(searchQuery);
		} catch (e) {
			popupStore.add(e.message || 'Failed to send request', 'error');
		} finally {
			actionPending = { ...actionPending, [userId]: false };
		}
	}

	async function acceptRequest(userId) {
		actionPending = { ...actionPending, [userId]: true };
		try {
			await API.acceptFriendRequest(userId);
			popupStore.add('Friend request accepted!', 'success');
			await Promise.all([fetchExplore(), fetchRequests(), fetchFriends()]);
		} catch (e) {
			popupStore.add(e.message || 'Failed to accept', 'error');
		} finally {
			actionPending = { ...actionPending, [userId]: false };
		}
	}

	async function declineRequest(userId) {
		actionPending = { ...actionPending, [userId]: true };
		try {
			await API.declineFriendRequest(userId);
			popupStore.add('Request declined.', 'info');
			await Promise.all([fetchExplore(), fetchRequests()]);
		} catch (e) {
			popupStore.add(e.message || 'Failed to decline', 'error');
		} finally {
			actionPending = { ...actionPending, [userId]: false };
		}
	}

	async function removeFriend(userId) {
		actionPending = { ...actionPending, [userId]: true };
		try {
			await API.removeFriend(userId);
			popupStore.add('Friend removed.', 'info');
			await fetchFriends();
		} catch (e) {
			popupStore.add(e.message || 'Failed to remove', 'error');
		} finally {
			actionPending = { ...actionPending, [userId]: false };
		}
	}

	async function cancelRequest(userId) {
		actionPending = { ...actionPending, [userId]: true };
		try {
			await API.cancelFriendRequest(userId);
			popupStore.add('Request cancelled.', 'info');
			await Promise.all([fetchExplore(), fetchRequests()]);
		} catch (e) {
			popupStore.add(e.message || 'Failed to cancel', 'error');
		} finally {
			actionPending = { ...actionPending, [userId]: false };
		}
	}

	// ── Tab switch ────────────────────────────────────────────────────────────
	function switchTab(tab) {
		activeTab = tab;
		if (tab === 'explore') fetchExplore();
		if (tab === 'friends' && friends.length === 0) fetchFriends();
		if (tab === 'requests') fetchRequests();
		if (tab === 'activity') fetchActivities();
	}

	// ── Relationship map (reactive) ───────────────────────────────────────────
	// Using $: so Svelte re-computes this whenever friends or friendRequests
	// change, which triggers re-renders in all {#each} blocks that reference
	// relationshipMap — even when the iterated array itself hasn't changed.
	$: relationshipMap = (() => {
		const map = {};
		for (const f of friends) map[f.userId] = 'friend';
		for (const r of friendRequests.incoming ?? []) if (!map[r.userId]) map[r.userId] = 'incoming';
		for (const r of friendRequests.outgoing ?? []) if (!map[r.userId]) map[r.userId] = 'outgoing';
		return map;
	})();
	$: onlineFriends = friends.filter((f) => f.isOnline);
	$: offlineFriends = friends.filter((f) => !f.isOnline);

	// ── Derived: stats ────────────────────────────────────────────────────────
	$: incomingCount = friendRequests.incoming?.length ?? 0;
	$: outgoingCount = friendRequests.outgoing?.length ?? 0;
	$: pendingTotal = incomingCount + outgoingCount;

	onMount(() => {
		const tab = $page.url.searchParams.get('tab');
		if (tab && ['explore', 'search', 'friends', 'requests', 'activity'].includes(tab)) {
			switchTab(tab);
		} else {
			fetchExplore();
		}
		API.assureItems();
		fetchFriends();
		fetchRequests();
	});
</script>

<svelte:head>
	<title>{Utils.getTitle('Friends', true)}</title>
</svelte:head>

<div class="relative min-h-screen overflow-hidden">
	<!-- Ambient blobs -->
	<div
		class="absolute top-24 left-16 w-36 h-36 bg-cyan-500/8 rounded-full blur-3xl animate-pulse"
	></div>
	<div
		class="absolute top-80 right-24 w-32 h-32 bg-green-500/8 rounded-full blur-3xl animate-pulse animation-delay-2000"
	></div>
	<div
		class="absolute bottom-32 left-1/4 w-28 h-28 bg-blue-500/8 rounded-full blur-3xl animate-pulse animation-delay-4000"
	></div>

	<div class="relative z-10 p-4 md:p-8 space-y-6">
		<FriendsHeader totalFriends={friends.length} pendingRequests={pendingTotal} />

		<!-- Tab bar -->
		<div
			class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-2 flex gap-1 overflow-x-auto no-scrollbar"
		>
			{#each [{ id: 'explore', label: 'Discover', icon: Compass }, { id: 'search', label: 'Search', icon: Search }, { id: 'friends', label: 'Friends', icon: Users }, { id: 'requests', label: 'Requests', icon: UserPlus }, { id: 'activity', label: 'Activity', icon: Activity }] as tab}
				<button
					id="tab-{tab.id}"
					on:click={() => switchTab(tab.id)}
					class="relative flex-1 flex items-center justify-center py-2.5 px-4 rounded-2xl text-sm font-medium border
						{activeTab === tab.id
						? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-400/40 text-white shadow-lg'
						: 'bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-gray-700/40'}"
				>
					<div class="flex items-center gap-2 pointer-events-none">
						<svelte:component this={tab.icon} class="w-4 h-4 shrink-0" />
						<span class="hidden sm:inline whitespace-nowrap">{tab.label}</span>
					</div>
					{#if tab.id === 'requests' && incomingCount > 0}
						<span
							class="absolute top-1.5 right-2 w-4 h-4 bg-pink-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
						>
							{incomingCount}
						</span>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Content container with fixed min-height to prevent jumping -->
		<div class="min-h-[500px]">
			<!-- ── EXPLORE ────────────────────────────────────────────────────────── -->
			{#if activeTab === 'explore'}
				<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6">
					<div class="flex items-center justify-between mb-6">
						<div>
							<h2 class="text-xl font-semibold text-white">Discover Players</h2>
							<p class="text-gray-400 text-sm mt-1">Players you might want to befriend</p>
						</div>
						<button
							id="btn-refresh-explore"
							on:click={fetchExplore}
							disabled={loadingExplore}
							class="flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-xl text-gray-300 text-sm hover:bg-gray-600/50 transition-all disabled:opacity-50"
						>
							<RefreshCw class="w-4 h-4 {loadingExplore ? 'animate-spin' : ''}" />
							Refresh
						</button>
					</div>

					{#if loadingExplore}
						<div class="flex items-center justify-center py-16">
							<Loader2 class="w-10 h-10 text-purple-400 animate-spin" />
						</div>
					{:else if explorePlayers.length === 0}
						<div class="text-center py-16">
							<Compass class="w-12 h-12 text-gray-500 mx-auto mb-4" />
							<h3 class="text-lg font-semibold text-gray-300 mb-2">No suggestions right now</h3>
							<p class="text-gray-500 text-sm">Check back later or search for players.</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each explorePlayers as player}
								{@const rel = relationshipMap[player.userId] ?? 'none'}
								<UserBox
									user={player}
									relationship={rel}
									{actionPending}
									onAdd={sendRequest}
									onAccept={acceptRequest}
									onDecline={declineRequest}
									onCancel={cancelRequest}
									onClick={openProfile}
								/>
							{/each}
						</div>
					{/if}
				</div>

				<!-- ── SEARCH ─────────────────────────────────────────────────────────── -->
			{:else if activeTab === 'search'}
				<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6">
					<h2 class="text-xl font-semibold text-white mb-4">Search Players</h2>
					<div class="relative mb-6">
						<Search
							class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
						/>
						<input
							id="input-search-players"
							type="text"
							placeholder="Search by username..."
							bind:value={searchQuery}
							on:input={onSearchInput}
							class="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
						/>
					</div>

					{#if loadingSearch}
						<div class="flex items-center justify-center py-12">
							<Loader2 class="w-10 h-10 text-purple-400 animate-spin" />
						</div>
					{:else if searchQuery && searchResults.length === 0}
						<div class="text-center py-12">
							<Search class="w-12 h-12 text-gray-500 mx-auto mb-4" />
							<h3 class="text-lg font-semibold text-gray-300 mb-2">No players found</h3>
							<p class="text-gray-500 text-sm">Try a different username.</p>
						</div>
					{:else if !searchQuery}
						<div class="text-center py-12 text-gray-500 text-sm">
							Start typing to search for players.
						</div>
					{:else}
						<div class="space-y-3">
							{#each searchResults as player}
								{@const rel = relationshipMap[player.userId] ?? 'none'}
								<UserBox
									user={player}
									relationship={rel}
									{actionPending}
									onAdd={sendRequest}
									onAccept={acceptRequest}
									onDecline={declineRequest}
									onCancel={cancelRequest}
									onClick={openProfile}
								/>
							{/each}
						</div>
					{/if}
				</div>

				<!-- ── FRIENDS ────────────────────────────────────────────────────────── -->
			{:else if activeTab === 'friends'}
				<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6">
					<div class="flex items-center justify-between mb-6">
						<div>
							<h2 class="text-xl font-semibold text-white">Your Friends</h2>
							<p class="text-gray-400 text-sm mt-1">
								{#if !loadingFriends}{friends.length}
									{friends.length === 1 ? 'friend' : 'friends'}{/if}
							</p>
						</div>
						<button
							id="btn-refresh-friends"
							on:click={fetchFriends}
							disabled={loadingFriends}
							class="flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-xl text-gray-300 text-sm hover:bg-gray-600/50 transition-all disabled:opacity-50"
						>
							<RefreshCw class="w-4 h-4 {loadingFriends ? 'animate-spin' : ''}" />
							Refresh
						</button>
					</div>

					{#if loadingFriends}
						<div class="flex items-center justify-center py-16">
							<Loader2 class="w-10 h-10 text-purple-400 animate-spin" />
						</div>
					{:else if friends.length === 0}
						<div class="text-center py-16">
							<Users class="w-12 h-12 text-gray-500 mx-auto mb-4" />
							<h3 class="text-lg font-semibold text-gray-300 mb-2">No friends yet</h3>
							<p class="text-gray-500 text-sm">
								Discover players or search to send friend requests.
							</p>
						</div>
					{:else}
						<div class="space-y-8">
							{#if onlineFriends.length > 0}
								<div class="space-y-3">
									<div class="flex items-center gap-2 px-2">
										<div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
										<h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Online — {onlineFriends.length}</h3>
									</div>
									<div class="space-y-3">
										{#each onlineFriends as friend}
											<UserBox
												user={friend}
												relationship="friend"
												{actionPending}
												onRemove={removeFriend}
												onClick={openProfile}
											/>
										{/each}
									</div>
								</div>
							{/if}

							{#if offlineFriends.length > 0}
								<div class="space-y-3">
									<div class="flex items-center gap-2 px-2">
										<div class="w-2 h-2 bg-gray-600 rounded-full"></div>
										<h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Offline — {offlineFriends.length}</h3>
									</div>
									<div class="space-y-3">
										{#each offlineFriends as friend}
											<div class="opacity-75 grayscale-[0.3] hover:opacity-100 hover:grayscale-0 transition-all duration-200">
												<UserBox
													user={friend}
													relationship="friend"
													{actionPending}
													onRemove={removeFriend}
													onClick={openProfile}
												/>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<!-- ── REQUESTS ───────────────────────────────────────────────────────── -->
			{:else if activeTab === 'requests'}
				<div class="space-y-6">
					<!-- Incoming -->
					<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6">
						<div class="flex items-center justify-between mb-6">
							<div>
								<h2 class="text-xl font-semibold text-white flex items-center gap-2">
									Incoming Requests
									{#if incomingCount > 0}
										<span
											class="px-2 py-0.5 bg-pink-500/20 border border-pink-400/30 rounded-full text-pink-300 text-xs font-bold"
											>{incomingCount}</span
										>
									{/if}
								</h2>
								<p class="text-gray-400 text-sm mt-1">People who want to be your friend</p>
							</div>
							<button
								id="btn-refresh-requests"
								on:click={fetchRequests}
								disabled={loadingRequests}
								class="flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-xl text-gray-300 text-sm hover:bg-gray-600/50 transition-all disabled:opacity-50"
							>
								<RefreshCw class="w-4 h-4 {loadingRequests ? 'animate-spin' : ''}" />
								Refresh
							</button>
						</div>

						{#if loadingRequests}
							<div class="flex items-center justify-center py-12">
								<Loader2 class="w-10 h-10 text-purple-400 animate-spin" />
							</div>
						{:else if friendRequests.incoming.length === 0}
							<div class="text-center py-10">
								<UserCheck class="w-10 h-10 text-gray-500 mx-auto mb-3" />
								<p class="text-gray-400 text-sm">No incoming friend requests.</p>
							</div>
						{:else}
							<div class="space-y-3">
								{#each friendRequests.incoming as req}
									<UserBox
										user={req}
										relationship="incoming"
										{actionPending}
										onAccept={acceptRequest}
										onDecline={declineRequest}
										onClick={openProfile}
									/>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Outgoing -->
					<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6">
						<h2 class="text-xl font-semibold text-white mb-1">Outgoing Requests</h2>
						<p class="text-gray-400 text-sm mb-6">Requests you've sent that are still pending</p>

						{#if loadingRequests}
							<div class="flex items-center justify-center py-10">
								<Loader2 class="w-8 h-8 text-purple-400 animate-spin" />
							</div>
						{:else if friendRequests.outgoing.length === 0}
							<div class="text-center py-10">
								<UserPlus class="w-10 h-10 text-gray-500 mx-auto mb-3" />
								<p class="text-gray-400 text-sm">No pending outgoing requests.</p>
							</div>
						{:else}
							<div class="space-y-3">
								{#each friendRequests.outgoing as req}
									<UserBox
										user={req}
										relationship="outgoing"
										{actionPending}
										onCancel={cancelRequest}
										onClick={openProfile}
									/>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- ── ACTIVITY ────────────────────────────────────────────────────────── -->
			{:else if activeTab === 'activity'}
				<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6">
					<div class="flex items-center justify-between mb-6">
						<div>
							<h2 class="text-xl font-semibold text-white">Friend Activity</h2>
							<p class="text-gray-400 text-sm mt-1">Recent actions from your friend circle</p>
						</div>
						<button
							on:click={fetchActivities}
							disabled={loadingActivities}
							class="flex items-center gap-2 px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-xl text-gray-300 text-sm hover:bg-gray-600/50 transition-all disabled:opacity-50"
						>
							<RefreshCw class="w-4 h-4 {loadingActivities ? 'animate-spin' : ''}" />
							Refresh
						</button>
					</div>

					{#if loadingActivities}
						<div class="space-y-3">
							{#each Array(5) as _}
								<div
									class="bg-gray-800/50 backdrop-blur-xl border border-gray-700/40 rounded-2xl p-4 flex items-center gap-3 animate-pulse"
								>
									<div class="w-12 h-12 bg-gray-700/50 rounded-full flex-shrink-0"></div>
									<div class="flex-1 space-y-2">
										<div class="h-4 bg-gray-700/50 rounded w-1/4"></div>
										<div class="h-3 bg-gray-700/30 rounded w-1/2"></div>
									</div>
								</div>
							{/each}
						</div>
					{:else if activities.length === 0}
						<div class="text-center py-16">
							<Activity class="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
							<h3 class="text-lg font-semibold text-gray-300 mb-2">No activity yet</h3>
							<p class="text-gray-500 text-sm">Activities from your friends will appear here.</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each activities as activity}
								<ActivityCard {activity} {timeAgo} />
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Profile popup -->
{#if selectedUserId}
	{@const rel = relationshipMap[selectedUserId] ?? 'none'}
	<UserProfilePopup
		userId={selectedUserId}
		relationship={rel}
		onSendRequest={sendRequest}
		onCancelRequest={cancelRequest}
		onClose={closeProfile}
	/>
{/if}

<style>
	.animation-delay-2000 {
		animation-delay: 2s;
	}
	.animation-delay-4000 {
		animation-delay: 4s;
	}
</style>
