<script>
	import { onMount } from 'svelte';
	import { Trophy, Medal, Award, User } from 'lucide-svelte';

	import API from '$lib/api.js';
	import Utils from '$lib/utils.js';

	import LeaderboardHeader from '$lib/components/Hub/Leaderboard/LeaderboardHeader.svelte';
	import SongSelector from '$lib/components/Hub/Leaderboard/SongSelector.svelte';
	import LeaderboardFilters from '$lib/components/Hub/Leaderboard/LeaderboardFilters.svelte';
	import CurrentSongDisplay from '$lib/components/Hub/Leaderboard/CurrentSongDisplay.svelte';
	import LeaderboardTable from '$lib/components/Hub/Leaderboard/LeaderboardTable.svelte';
	import Pagination from '$lib/components/Hub/Leaderboard/Pagination.svelte';
	import UserProfilePopup from '$lib/components/Hub/Shared/UserProfilePopup.svelte';
	import { popupStore } from '$lib/stores/popup';
	import { user } from '$lib/stores/user';
	import DOTWDisplay from '$lib/components/Hub/Leaderboard/DOTWDisplay.svelte';

	let allSongs = [];
	let platforms = [];
	let versions = [];
	let selectedSong = null;
	let selectedVersion = null;
	let selectedPlatform = { id: 'all', name: 'All Platforms', icon: '🌐' };
	let searchQuery = '';
	let currentPage = 1;
	let leaderboardData = [];
	let filteredData = [];
	let loadingSongs = true;
	let lastLeaderboardRequest = null;
	let selectedUserId = null;
	let friends = [];
	let friendRequests = { incoming: [], outgoing: [] };
	let actionPending = {};
	let loadingLeaderboard = false;
	let loadingDotw = false;
	let dotwData = {};
	let isAllPlatforms = false;

	const itemsPerPage = 10;

	onMount(async () => {
		try {
			const [games, songDb] = await Promise.all([API.getGames(), API.getSongs(), fetchFriends(), fetchRequests()]);

			const availableSongVersions = new Set(songDb.map((s) => String(s.jdVersion)));

			const gamesWithSongs = games.filter(
				(game) => game.isAvailable && availableSongVersions.has(String(game.jdVersion))
			);

			gamesWithSongs.unshift({ id: 'all', name: 'All Games', isAvailable: true, platforms: [], jdVersion: null });
			versions = gamesWithSongs;
			allSongs = songDb;

			platforms = [
				{ id: 'all', name: 'All Platforms', icon: '🌐', color: 'from-gray-500 to-gray-600' },
				...[
					...new Map(
						gamesWithSongs
							.flatMap((g) => g.platforms)
							.filter((p) => p.isAvailable && p.hasLeaderboards)
							.map((p) => [p.id, { id: p.id, name: p.name, icon: '🎮', color: 'from-gray-500 to-gray-600' }])
					).values()
				]
			];

			console.log("platforms", platforms);

			if (platforms.length > 0) selectedPlatform = platforms[0];

			if (versions.length > 0) {
				selectedVersion = versions[0];
				const versionSongs = allSongs.filter(
					(s) => String(s.jdVersion) === String(selectedVersion.id)
				);
				if (versionSongs.length > 0) selectedSong = versionSongs[0];
			}
		} catch (error) {
			console.error('Failed loading data:', error);
			platforms = [];
			versions = [];
			allSongs = [];
			selectedPlatform = { id: 'all', name: 'All Platforms', icon: '🌐' };
		} finally {
			loadingSongs = false;
		}
	});

	// Auto-load leaderboard when song/platform changes
	$: if (selectedSong && selectedVersion && selectedPlatform && !loadingLeaderboard) {
		loadLeaderboardData();
		loadDOTWData();
	}

	$: filteredData = filterLeaderboard(leaderboardData, searchQuery, selectedPlatform);
	$: totalPages = Math.ceil(filteredData.length / itemsPerPage);
	$: paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
	$: currentUserRank = filteredData.find((entry) => entry.isCurrentUser)?.globalRank;

	async function loadLeaderboardData() {
		if (!selectedSong || !selectedVersion || !selectedPlatform) return;
		const requestKey = `${selectedSong.mapName}-${selectedSong.jdVersion}-${selectedPlatform.id}`;
		if (requestKey === lastLeaderboardRequest) return;
		lastLeaderboardRequest = requestKey;
		loadingLeaderboard = true;
		try {
			const [rawData, currentUser] = await Promise.all([
				API.getLeaderboard(selectedSong.mapName, selectedPlatform.id, 100, 0),
				API.getCurrentUser()
			]);
			leaderboardData = rawData.map((entry, index) => ({
				...entry,
				globalRank: index + 1,
				isCurrentUser: currentUser.profiles.find(
					(p) => p.platformType === entry.platform && p.nameOnPlatform == entry.username
				)
			}));
		} catch (error) {
			console.error('Failed to load leaderboard:', error);
			leaderboardData = [];
		} finally {
			loadingLeaderboard = false;
		}
	}

	async function loadDOTWData() {
		try {
			loadingDotw = true;
			dotwData = await API.getDOTW(selectedSong.mapName);
		} catch (error) {
			console.error('Failed to load DOTW data:', error);
		} finally {
			loadingDotw = false;
		}
	}

	function filterLeaderboard(data, query, platform) {
		return data.filter((entry) => {
			if (platform.id !== 'all' && entry.platform !== platform.id) return false;
			if (query && !entry.username.toLowerCase().includes(query.toLowerCase())) return false;
			return true;
		});
	}

	function getRankIcon(rank) {
		if (rank === 1) return { icon: Trophy, color: 'text-yellow-400', bg: 'from-yellow-400/20 to-yellow-600/20' };
		if (rank === 2) return { icon: Medal,  color: 'text-gray-300',   bg: 'from-gray-300/20 to-gray-500/20' };
		if (rank === 3) return { icon: Award,  color: 'text-amber-600',  bg: 'from-amber-600/20 to-amber-800/20' };
		return           { icon: User,  color: 'text-gray-400',   bg: 'from-gray-400/10 to-gray-600/10' };
	}

	function goToPage(page) {
		if (page >= 1 && page <= totalPages) currentPage = page;
	}

	function clearFilters() {
		selectedPlatform = platforms.length > 0 ? platforms[0] : { id: 'all', name: 'All Platforms', icon: '🌐' };
		searchQuery = '';
	}

	function openProfile(userId)  { selectedUserId = userId; }
	function closeProfile()       { selectedUserId = null; }

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

	function getPlatformDisplayName(platformId) {
		return (platforms.find((p) => p.id === platformId) ?? { name: platformId.toUpperCase() }).name;
	}
	function getPlatformIcon(platformId) {
		return (platforms.find((p) => p.id === platformId) ?? { icon: '🌐' }).icon;
	}

	// Reset page on song/platform/search change
	$: if (selectedSong || selectedPlatform || searchQuery) {
		currentPage = 1;
	}
	$: if (selectedPlatform) {
		isAllPlatforms = selectedPlatform.id === 'all';
	}
</script>

<svelte:head>
	<title>{Utils.getTitle('Leaderboard', true)}</title>
</svelte:head>

<div class="relative min-h-screen overflow-hidden">
	<div class="absolute top-24 left-16 w-36 h-36 bg-pink-500/8 rounded-full blur-3xl animate-pulse"></div>
	<div class="absolute top-80 right-24 w-32 h-32 bg-purple-500/8 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
	<div class="absolute bottom-32 left-1/4 w-28 h-28 bg-blue-500/8 rounded-full blur-3xl animate-pulse animation-delay-4000"></div>

	<div class="relative z-10 p-4 md:p-8 space-y-6 md:space-y-8">
		<LeaderboardHeader {filteredData} {currentUserRank} />
		<SongSelector
			bind:allSongs
			bind:selectedSong
			bind:selectedVersion
			{versions}
			{loadingSongs}
		/>
		{#if selectedSong}
			<LeaderboardFilters bind:searchQuery bind:selectedPlatform {clearFilters} {platforms} />
			<CurrentSongDisplay {selectedSong} {selectedPlatform} {versions} />
			<!-- Only show DOTW if all platforms are selected -->
			{#if isAllPlatforms}
				<DOTWDisplay {dotwData} {loadingDotw} onClick={openProfile} {relationshipMap} />
			{/if}
			<LeaderboardTable
				{loadingLeaderboard}
				{paginatedData}
				onClick={openProfile}
				{getRankIcon}
				{currentPage}
				{itemsPerPage}
				{filteredData}
				{relationshipMap}
			/>
			<Pagination {currentPage} {totalPages} {goToPage} />

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
	{/if}
	</div>
</div>

<style>
	.animation-delay-2000 { animation-delay: 2s; }
	.animation-delay-4000 { animation-delay: 4s; }

	::-webkit-scrollbar { width: 6px; height: 6px; }
	::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 3px; }
	::-webkit-scrollbar-thumb { background: linear-gradient(to bottom, #8b5cf6, #ec4899); border-radius: 3px; }
	::-webkit-scrollbar-thumb:hover { background: linear-gradient(to bottom, #7c3aed, #db2777); }

	@media (prefers-reduced-motion: reduce) {
		*, *::before, *::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>