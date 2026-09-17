<script>
	import { onMount } from 'svelte';
	import { Globe, Loader2 } from 'lucide-svelte';

	import API from '$lib/api.js';
	import Utils from "$lib/utils.js";

	import SpotlightHeader from '$lib/components/Hub/Spotlight/SpotlightHeader.svelte';
	import SpotlightTop3 from '$lib/components/Hub/Spotlight/SpotlightTop3.svelte';
	import SpotlightTable from '$lib/components/Hub/Spotlight/SpotlightTable.svelte';
	import SpotlightPagination from '$lib/components/Hub/Spotlight/SpotlightPagination.svelte';
	import UserProfilePopup from '$lib/components/Hub/Shared/UserProfilePopup.svelte';
	import { popupStore } from '$lib/stores/popup';
	import { user } from '$lib/stores/user';

	let allPlayers = [];
	let friends = [];
	let friendRequests = { incoming: [], outgoing: [] };
	let actionPending = {};
	let top3Players = [];
	let tableData = [];
	let loading = true;
	let currentPage = 1;
	let totalPages = 1;
	let totalPlayers = 0;
	let computedAt = null;
	const itemsPerPage = 10;

	// ── Profile popup ─────────────────────────────────────────────────────────
	let selectedUserId = null;

	function openProfile(userId) {
		selectedUserId = userId;
	}

	function closeProfile() {
		selectedUserId = null;
	}

	// ── Friendship helpers (same pattern as friends page) ────────────────
	async function sendRequest(userId) {
		actionPending = { ...actionPending, [userId]: true };
		try {
			await API.sendFriendRequest(userId);
			popupStore.add('Friend request sent!', 'success');
			await Promise.all([fetchFriends(), fetchRequests()]);
		} catch (e) {
			popupStore.add(e.message || 'Failed to send request', 'error');
		} finally {
			actionPending = { ...actionPending, [userId]: false };
		}
	}

	async function cancelRequest(userId) {
		actionPending = { ...actionPending, [userId]: true };
		try {
			await API.cancelFriendRequest(userId);
			popupStore.add('Request cancelled.', 'info');
			await Promise.all([fetchFriends(), fetchRequests()]);
		} catch (e) {
			popupStore.add(e.message || 'Failed to cancel', 'error');
		} finally {
			actionPending = { ...actionPending, [userId]: false };
		}
	}

	async function fetchFriends() {
		try { friends = await API.getFriends(); } catch { friends = []; }
	}

	async function fetchRequests() {
		try { friendRequests = await API.getFriendRequests(); } catch { friendRequests = { incoming: [], outgoing: [] }; }
	}

	$: relationshipMap = (() => {
		const map = {};
		for (const f of friends) map[f.userId] = 'friend';
		for (const r of friendRequests.incoming ?? []) if (!map[r.userId]) map[r.userId] = 'incoming';
		for (const r of friendRequests.outgoing ?? []) if (!map[r.userId]) map[r.userId] = 'outgoing';
		return map;
	})();

	onMount(async () => {
		await Promise.all([loadSpotlightData(), fetchFriends(), fetchRequests()]);
	});

	async function loadSpotlightData() {
		try {
			loading = true;

			// Fetch all players — server returns the full list
			const response = await API.getSpotlight();
			allPlayers = response.players || [];
			totalPlayers = response.total || 0;
			computedAt = response.computedAt || null;

			// Top 3 are always the same
			top3Players = allPlayers.slice(0, 3);

			// Remaining players (excluding top 3) for paginated table
			const tablePlayers = allPlayers.slice(3);
			totalPages = Math.ceil(Math.max(0, tablePlayers.length) / itemsPerPage);

			// Apply current page
			goToPage(1);
		} catch (error) {
			console.error('Failed to load spotlight data:', error);
			allPlayers = [];
			top3Players = [];
			tableData = [];
		} finally {
			loading = false;
		}
	}

	function goToPage(page) {
		if (page < 1) page = 1;
		if (page > totalPages) page = totalPages;
		currentPage = page;

		const tablePlayers = allPlayers.slice(3);
		const start = (page - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		tableData = tablePlayers.slice(start, end);
	}
</script>

<svelte:head>
    <title>{Utils.getTitle("Spotlight", true)}</title> 
</svelte:head>

<div class="relative min-h-screen overflow-hidden">
	<!-- Background Elements -->
	<div class="absolute top-24 left-16 w-36 h-36 bg-yellow-500/8 rounded-full blur-3xl animate-pulse"></div>
	<div class="absolute top-80 right-24 w-32 h-32 bg-pink-500/8 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
	<div class="absolute bottom-32 left-1/4 w-28 h-28 bg-red-500/8 rounded-full blur-3xl animate-pulse animation-delay-4000"></div>

	<!-- Rotating World Icon Background -->
	<div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
		<Globe class="w-96 h-96 text-white animate-spin-slow" />
	</div>

	<div class="relative z-10 p-4 md:p-8 space-y-6 md:space-y-12">
		<SpotlightHeader {totalPlayers} {computedAt} />
		
		{#if loading}
			<div class="text-center py-20">
				<Loader2 class="w-16 h-16 text-pink-400 animate-spin mx-auto mb-6" />
				<p class="text-gray-400 text-lg">Loading spotlight players...</p>
			</div>
		{:else if allPlayers.length === 0}
			<div class="text-center py-20">
				<div class="w-24 h-24 mx-auto mb-6 bg-gray-700/50 rounded-full flex items-center justify-center">
					<Globe class="w-12 h-12 text-gray-400" />
				</div>
				<h3 class="text-2xl font-semibold text-gray-300 mb-2">No players in spotlight!</h3>
				<p class="text-gray-400">Please check back later to see featured players.</p>
			</div>
		{:else}
			<SpotlightTop3 {top3Players} onClick={openProfile} {relationshipMap} currentUserId={$user?.userId} />
			
			{#if tableData.length > 0}
				<SpotlightTable {tableData} startRank={4 + (currentPage - 1) * itemsPerPage} onClick={openProfile} {relationshipMap} currentUserId={$user?.userId} />
				
				{#if totalPages > 1}
					<SpotlightPagination {currentPage} {totalPages} {goToPage} />
				{/if}
			{/if}
		{/if}
	</div>
</div>

<!-- Profile popup -->
{#if selectedUserId}
	{@const rel = relationshipMap[selectedUserId] ?? 'none'}
	{@const isSelf = selectedUserId === $user?.userId}
	<UserProfilePopup
		userId={selectedUserId}
		relationship={isSelf ? 'self' : rel}
		onSendRequest={isSelf ? null : sendRequest}
		onCancelRequest={isSelf ? null : cancelRequest}
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

	.animate-spin-slow {
		animation: spin 20s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	::-webkit-scrollbar {
		width: 6px;
		height: 6px;
	}

	::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.1);
		border-radius: 3px;
	}

	::-webkit-scrollbar-thumb {
		background: linear-gradient(to bottom, #f97316, #dc2626);
		border-radius: 3px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(to bottom, #ea580c, #b91c1c);
	}

	button,
	input,
	select {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	button:hover {
		transform: translateY(-1px);
	}

	button:active {
		transform: translateY(0);
	}

	button:disabled:hover {
		transform: none;
	}

	@keyframes gradient-shift {
		0%,
		100% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
	}

	.animate-gradient {
		background-size: 200% 200%;
		animation: gradient-shift 3s ease infinite;
	}

	@keyframes pulse-glow {
		from {
			box-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
		}
		to {
			box-shadow:
				0 0 20px rgba(255, 215, 0, 0.8),
				0 0 30px rgba(255, 215, 0, 0.4);
		}
	}

	.spotlight-glow {
		animation: pulse-glow 2s ease-in-out infinite alternate;
	}

	@supports not (backdrop-filter: blur(12px)) {
		.backdrop-blur-xl {
			background-color: rgba(17, 24, 39, 0.8);
		}

		.backdrop-blur-sm {
			background-color: rgba(17, 24, 39, 0.6);
		}
	}

	button:focus-visible {
		outline: 2px solid rgba(249, 115, 22, 0.5);
		outline-offset: 2px;
	}

	.glass {
		backdrop-filter: blur(16px) saturate(180%);
		background-color: rgba(17, 25, 40, 0.75);
		border: 1px solid rgba(255, 255, 255, 0.125);
	}

	@media (max-width: 768px) {
		.mobile-stack {
			flex-direction: column;
		}

		.mobile-full {
			width: 100%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>