<script>
	import { onMount, onDestroy } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import {
		Music,
		Award,
		Users,
		Play,
		Vote,
		Clock,
		Activity,
		Earth,
		Trophy,
		ChevronRight,
		Star,
		Swords,
		Shield,
		Zap,
		Eye,
		Medal,
		User
	} from 'lucide-svelte';
	import API from '$lib/api.js';
	import Utils from '$lib/utils';
	import colors from '$lib/colors';
	import Loader from '$lib/components/Loader.svelte';
	import Icon from '@iconify/svelte';
	import CountryFlag from '$lib/components/CountryFlag.svelte';
	import Avatar from '$lib/components/Hub/Shared/Avatar.svelte';
	import SongBadge from '$lib/components/Hub/Shared/SongBadge.svelte';

	let rooms = [];
	let selectedRoom = null;
	let songs = [];

	let liveData = {};
	let liveScores = [];
	let liveCCU = 0;

	// Tweened animators
	const animatedCount = tweened(0, { duration: 400, easing: cubicOut });

	// Individual tweened stores for player scores
	let displayScores = {};
	const scoreTweens = new Map();

	let isReady = false;
	let isInitialLoad = true;
	let isRefreshing = false;

	let abortController = null;
	let nextScreenTimer = null;
	let ccuTimer = null;

	let rafId = null;
	let currentScreenEndTime = 0;
	let countdownSeconds = 0;
	let prevScreenKey = null;
	let screenChanging = false;

	// --- Screen helpers ---

	const BOSS_SCREENS = new Set(['boss-intro', 'boss-lobby', 'boss-recap']);
	const VOTE_SCREENS = new Set(['vote', 'vote-lobby', 'vote-recap']);
	const TOURNAMENT_SCREENS = new Set([
		'tournament-presentation',
		'tournament-lobby',
		'tournament-recap'
	]);
	const TEAMBATTLE_SCREENS = new Set(['teambattle-intro', 'teambattle-lobby', 'teambattle-recap']);
	const SIDEVSIDE_SCREENS = new Set(['side-selection', 'sidevside-lobby', 'sidevside-recap']);
	const SPOTLIGHT_SCREENS = new Set(['spotlight-intro', 'spotlight-lobby', 'spotlight-recap']);

	function getScreenTheme(type) {
		if (BOSS_SCREENS.has(type)) return 'boss';
		if (VOTE_SCREENS.has(type)) return 'vote';
		if (TOURNAMENT_SCREENS.has(type)) return 'tournament';
		if (TEAMBATTLE_SCREENS.has(type)) return 'teambattle';
		if (SIDEVSIDE_SCREENS.has(type)) return 'sidevside';
		if (SPOTLIGHT_SCREENS.has(type)) return 'spotlight';
		if (type === 'in-game') return 'ingame';
		if (type === 'waiting-screen') return 'waiting';
		return 'default';
	}

	function getScreenLabel(type) {
		const labels = {
			'in-game': 'Song in Progress',
			'waiting-screen': 'Waiting',
			vote: 'Vote for a Song',
			'vote-lobby': 'Vote Lobby',
			'vote-recap': 'Vote Results',
			'map-lobby': 'Lobby',
			'map-recap': 'Song Recap',
			'boss-intro': 'Boss Intro',
			'boss-lobby': 'Boss Lobby',
			'boss-recap': 'Boss Recap',
			'spotlight-intro': 'Spotlight Intro',
			'spotlight-lobby': 'Spotlight Lobby',
			'spotlight-recap': 'Spotlight Recap',
			'teambattle-intro': 'Team Battle Intro',
			'teambattle-lobby': 'Team Battle Lobby',
			'teambattle-recap': 'Team Battle Recap',
			'tournament-presentation': 'Tournament Presentation',
			'tournament-lobby': 'Tournament Lobby',
			'tournament-recap': 'Tournament Recap',
			'side-selection': 'Side Selection',
			'sidevside-lobby': 'Side vs Side Lobby',
			'sidevside-recap': 'Side vs Side Recap'
		};
		return labels[type] || type;
	}

	function getScreenGradient(type) {
		const theme = getScreenTheme(type);
		const map = {
			ingame: 'from-green-500 to-emerald-600',
			waiting: 'from-gray-500 to-gray-600',
			vote: 'from-blue-500 to-purple-600',
			tournament: 'from-yellow-500 to-orange-500',
			boss: 'from-red-500 to-pink-600',
			teambattle: 'from-orange-500 to-red-600',
			sidevside: 'from-cyan-500 to-blue-600',
			spotlight: 'from-yellow-400 to-pink-500',
			default: 'from-pink-500 to-purple-600'
		};
		return map[theme] || map.default;
	}

	function getScreenIcon(type) {
		const theme = getScreenTheme(type);
		switch (theme) {
			case 'ingame':
				return Play;
			case 'vote':
				return Vote;
			case 'tournament':
				return Trophy;
			case 'boss':
				return Swords;
			case 'teambattle':
				return Shield;
			case 'sidevside':
				return Zap;
			case 'spotlight':
				return Star;
			case 'waiting':
				return Clock;
			default:
				return Music;
		}
	}

	function getRankIcon(rank) {
		if (rank === 1)
			return { icon: Trophy, bg: 'from-yellow-400/20 to-yellow-600/20', color: 'text-yellow-400' };
		if (rank === 2)
			return { icon: Medal, bg: 'from-gray-300/20 to-gray-500/20', color: 'text-gray-300' };
		if (rank === 3)
			return { icon: Award, bg: 'from-amber-600/20 to-amber-800/20', color: 'text-amber-600' };
		return { icon: User, bg: 'from-gray-600/20 to-gray-700/20', color: 'text-gray-400' };
	}

	function formatCountdown(seconds) {
		if (seconds <= 0) return '0:00';
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function secondsUntil(unixTimestamp) {
		return Math.max(0, Math.ceil(unixTimestamp - Date.now() / 1000));
	}

	function getSongInfo(mapName) {
		const found = songs.find((s) => s.mapName === mapName);
		return {
			title: found?.title || mapName || '—',
			artist: found?.artist || 'Unknown',
			coverUrl: found?.assets?.cover || API.getCoverUrl(null)
		};
	}

	// Dynamically format scores depending on if they are decimals (JD15) or whole numbers (JD16+)
	function formatAnimatedScore(score) {
		if (score === undefined || score === null) return '0';
		if (score > 0 && score < 10) {
			return score.toFixed(4); // e.g. 0.0558
		}
		return Math.round(score).toLocaleString(); // e.g. 11,399
	}

	function isSeasonEmpty(obj) {
		return !obj || Object.keys(obj).length === 0;
	}

	function startCountdownLoop() {
		if (rafId) cancelAnimationFrame(rafId);
		function tick() {
			countdownSeconds = secondsUntil(currentScreenEndTime);
			rafId = requestAnimationFrame(tick);
		}
		rafId = requestAnimationFrame(tick);
	}

	// --- Data fetching ---

	onMount(async () => {
		const [fetchedRooms, fetchedSongs] = await Promise.all([API.getWDFRooms(), API.getSongs()]);

		rooms = fetchedRooms || [];
		songs = fetchedSongs || [];

		isReady = true;

		if (rooms.length > 0) {
			selectedRoom = rooms[0].room;
		} else {
			isInitialLoad = false;
		}
	});

	onDestroy(() => {
		clearAllTimers();
	});

	function clearAllTimers() {
		if (abortController) abortController.abort();
		if (nextScreenTimer) clearTimeout(nextScreenTimer);
		if (ccuTimer) clearInterval(ccuTimer);
		if (rafId) cancelAnimationFrame(rafId);
	}

	function startPeriodicData() {
		if (ccuTimer) clearInterval(ccuTimer);
		fetchCCUAndScores();
		ccuTimer = setInterval(fetchCCUAndScores, 5000);
	}

	async function fetchCCUAndScores() {
		if (!selectedRoom) return;

		API.getWDFCCU(selectedRoom)
			.then((ccuData) => {
				if (ccuData !== null && ccuData !== undefined) {
					let parsedCCU = 0;
					// Handles instances where API returns stringified JSON, raw objects, or numbers
					if (typeof ccuData === 'string') {
						try {
							parsedCCU = JSON.parse(ccuData).ccu ?? 0;
						} catch (e) {
							parsedCCU = Number(ccuData) || 0;
						}
					} else if (typeof ccuData === 'object') {
						parsedCCU = ccuData.ccu ?? 0;
					} else {
						parsedCCU = Number(ccuData) || 0;
					}
					liveCCU = parsedCCU;
				}
			})
			.catch((err) => console.error('Failed to fetch live CCU:', err));

		API.getWDFLiveScores(selectedRoom)
			.then((scoresData) => {
				if (scoresData) {
					liveScores = Array.isArray(scoresData) ? scoresData : scoresData.scores || [];

					liveScores.forEach((p) => {
						if (!scoreTweens.has(p.username)) {
							// Start from 0 to initiate the number addition animation
							const t = tweened(0, { duration: 600, easing: cubicOut });
							t.subscribe((val) => {
								displayScores[p.username] = val;
								displayScores = displayScores; // Trigger Svelte reactivity
							});
							scoreTweens.set(p.username, t);
							t.set(p.score); // Animate up to the actual score
						} else {
							// Animate towards the newly fetched score
							scoreTweens.get(p.username).set(p.score);
						}
					});
				}
			})
			.catch((err) => console.error('Failed to fetch live Scores:', err));
	}

	async function fetchWDFStatus() {
		if (abortController) abortController.abort();
		if (nextScreenTimer) clearTimeout(nextScreenTimer);

		abortController = new AbortController();
		const signal = abortController.signal;
		isRefreshing = true;

		try {
			const status = await API.getWDFStatus(selectedRoom);
			if (signal.aborted) return;
			if (!status) return;

			const now = Date.now() / 1000;
			const rawScreens = status.screens || [];
			const season = status.season || null;

			const enrichedScreens = rawScreens.map((screen) => ({
				...screen,
				song: getSongInfo(screen.mapName),
				label: getScreenLabel(screen.type),
				gradient: getScreenGradient(screen.type),
				icon: getScreenIcon(screen.type),
				voteOptions: screen.voteInfo?.voteOptions?.map((opt) => getSongInfo(opt)) || []
			}));

			const newKey = enrichedScreens[0]?.type + '|' + enrichedScreens[0]?.startTime;
			if (prevScreenKey && newKey !== prevScreenKey) {
				screenChanging = true;
				setTimeout(() => {
					screenChanging = false;
				}, 500);
			}
			prevScreenKey = newKey;

			currentScreenEndTime = enrichedScreens[0]?.endTime ?? 0;

			liveData = {
				...liveData,
				[selectedRoom]: { screens: enrichedScreens, season }
			};

			const nearestEnd = rawScreens.reduce((min, s) => {
				const delay = (s.endTime - now) * 1000;
				return delay > 0 && delay < min ? delay : min;
			}, Infinity);

			if (nearestEnd !== Infinity) {
				nextScreenTimer = setTimeout(() => {
					if (!signal.aborted) fetchWDFStatus();
				}, nearestEnd + 800);
			}
		} catch (err) {
			if (err.name === 'AbortError') return;
			console.error('WDF fetch error:', err);
		} finally {
			if (!abortController?.signal.aborted) isRefreshing = false;
		}
	}

	let prevRoom = null;
	$: if (isReady && selectedRoom && selectedRoom !== prevRoom) {
		prevRoom = selectedRoom;
		isInitialLoad = true;
		liveScores = [];
		liveCCU = 0;
		displayScores = {};
		scoreTweens.clear(); // Clear memory/animations for previous room

		fetchWDFStatus().then(() => {
			startPeriodicData();
			startCountdownLoop();
			isInitialLoad = false;
		});
	}

	$: currentData = liveData[selectedRoom] || { screens: [], season: null };
	$: animatedCount.set(liveCCU);
	$: currentScreen = currentData.screens?.[0] || null;
	$: upcomingScreens = currentData.screens?.slice(1) || [];
	$: season = !isSeasonEmpty(currentData.season) ? currentData.season : null;
	$: hasTournament = season && !isSeasonEmpty(season.previousSeasonWinner);
</script>

<svelte:head>
	<title>{Utils.getTitle('World Dance Floor', true)}</title>
</svelte:head>

<div class="relative min-h-screen">
	<!-- Background orbs -->
	<div class="absolute inset-0 overflow-hidden pointer-events-none">
		<div
			class="absolute top-32 left-20 w-40 h-40 bg-pink-500/8 rounded-full blur-3xl animate-pulse"
		></div>
		<div
			class="absolute top-80 right-32 w-36 h-36 bg-purple-500/8 rounded-full blur-3xl animate-pulse animation-delay-2000"
		></div>
		<div
			class="absolute bottom-40 left-1/4 w-32 h-32 bg-blue-500/8 rounded-full blur-3xl animate-pulse animation-delay-4000"
		></div>
	</div>

	<div class="relative z-10 p-4 md:p-8 space-y-6">
		<!-- Header -->
		<div class="relative">
			<div
				class="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-3xl blur-xl"
			></div>
			<div
				class="relative bg-gray-800/40 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-8"
			>
				<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
					<div class="flex items-center gap-4">
						<div class="relative">
							<div
								class="w-16 h-16 bg-gradient-to-r {colors.wdf} rounded-2xl flex items-center justify-center shadow-2xl"
							>
								<Earth class="w-8 h-8 text-white" />
							</div>
							<div
								class="absolute inset-0 bg-gradient-to-r {colors.wdf} opacity-20 rounded-2xl blur-lg scale-150"
							></div>
						</div>
						<div>
							<h1
								class="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
							>
								World Dance Floor
							</h1>
							<p class="text-gray-400 mt-2">Real-time game activity across all platforms.</p>
						</div>
					</div>
					{#if season}
						<div
							class="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-4 py-2"
						>
							<Trophy class="w-4 h-4 text-yellow-400" />
							<span class="text-yellow-300 font-semibold text-sm">Season {season.seasonNumber}</span
							>
							{#if season.currentSeasonDancerCount}
								<span class="text-gray-400 text-xs"
									>· {season.currentSeasonDancerCount.toLocaleString()} dancers</span
								>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Room selector -->
		<div class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-4 md:p-6">
			<label class="block text-sm font-medium text-gray-300 mb-3">Room</label>
			<div class="relative md:hidden">
				<select
					bind:value={selectedRoom}
					class="w-full appearance-none bg-gray-700/50 border border-gray-600/50 text-white rounded-xl px-4 py-3 pr-10 focus:border-pink-400/50 focus:outline-none transition-all"
				>
					{#each rooms as room}
						<option value={room.room}>{room.name}</option>
					{/each}
				</select>
				<svg
					class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</div>
			<div class="hidden md:flex gap-3 flex-wrap">
				{#each rooms as room}
					<button
						class="group relative morphing-tab-btn px-5 py-2.5 rounded-2xl font-medium transition-all duration-500 whitespace-nowrap
							{selectedRoom === room.room
							? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-2xl scale-105'
							: 'bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 text-gray-300 hover:border-purple-400/50 hover:text-white hover:scale-105'}"
						on:click={() => (selectedRoom = room.room)}
					>
						{#if selectedRoom === room.room}
							<div
								class="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-600/20 rounded-2xl blur-lg"
							></div>
						{/if}
						<span class="relative z-10 flex items-center gap-2">
							{room.name}
							{#if room.seasonsEnabled}
								<Trophy class="w-3.5 h-3.5 text-yellow-300 opacity-80" />
							{/if}
						</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Main content -->
		{#if isInitialLoad || !isReady}
			<div class="flex justify-center items-center h-60">
				<Loader />
			</div>
		{:else}
			<!-- Player count + countdown -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div
					class="relative bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6"
				>
					<div
						class="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-3xl blur-xl"
					></div>
					<div class="relative flex items-center gap-4">
						<div>
							<div
								class="text-5xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent tabular-nums"
							>
								{Math.round($animatedCount)}
							</div>
							<div class="text-gray-300 mt-1">Players Online</div>
						</div>
						<div class="ml-auto flex flex-col items-end gap-2">
							<div
								class="px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-white text-xs font-bold animate-pulse shadow-lg"
							>
								LIVE
							</div>
							{#if isRefreshing}
								<div class="px-3 py-1 bg-gray-700/60 rounded-full text-gray-400 text-xs">
									Refreshing…
								</div>
							{/if}
						</div>
					</div>
				</div>

				<div
					class="relative bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6"
				>
					<div
						class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-3xl blur-xl"
					></div>
					<div class="relative flex items-center gap-4 h-full">
						<Clock class="w-8 h-8 text-blue-400 flex-shrink-0" />
						<div>
							<div class="text-xs text-gray-400 mb-1">Current screen ends in</div>
							<div
								class="text-3xl font-bold text-white tabular-nums {countdownSeconds <= 5
									? 'text-red-400 countdown-urgent'
									: ''}"
							>
								{formatCountdown(countdownSeconds)}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Current screen -->
			{#if currentScreen}
				{#key currentScreen.type + currentScreen.startTime}
					<div class="relative group screen-enter">
						<div
							class="absolute inset-0 bg-gradient-to-r {currentScreen.gradient} opacity-10 rounded-3xl blur-xl group-hover:opacity-20 transition-opacity duration-500"
						></div>
						<div
							class="relative bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6 md:p-8"
						>
							<div class="flex items-center gap-3 mb-6">
								<div class="relative">
									<div
										class="w-10 h-10 bg-gradient-to-r {currentScreen.gradient} rounded-xl flex items-center justify-center shadow-lg"
									>
										<svelte:component this={currentScreen.icon} class="w-5 h-5 text-white" />
									</div>
									<div
										class="absolute inset-0 bg-gradient-to-r {currentScreen.gradient} opacity-30 rounded-xl blur-lg scale-125"
									></div>
								</div>
								<div>
									<div class="text-xs text-gray-400 uppercase tracking-wider font-semibold">
										Now Playing
									</div>
									<div class="text-white font-bold text-lg">{currentScreen.label}</div>
								</div>
								<div class="ml-auto text-right">
									<div class="text-xs text-gray-400">Ends in</div>
									<div
										class="text-white font-bold tabular-nums {countdownSeconds <= 5
											? 'text-red-400'
											: ''}"
									>
										{formatCountdown(countdownSeconds)}
									</div>
								</div>
							</div>

							<!-- Vote Options Display -->
							{#if currentScreen.voteOptions && currentScreen.voteOptions.length > 0}
								<!-- center items -->
								<!-- Container: Flex works best here to keep the VS badges vertically centered between cards -->
								<div class="flex flex-wrap items-center justify-center gap-4 mt-4">
									{#each currentScreen.voteOptions as opt, i}
										<!-- The VS Badge: Show before every item EXCEPT the first one -->
										{#if i > 0}
											<div class="flex items-center justify-center">
												<span
													class="text-purple-400 font-black text-sm md:text-base bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
												>
													VS
												</span>
											</div>
										{/if}

										<!-- Vote Option Card -->
										<div
											class="w-[calc(50%-2rem)] md:w-44 bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 flex flex-col items-center text-center hover:border-purple-400/50 transition-colors"
										>
											<img
												src={opt.coverUrl}
												alt="cover"
												class="w-20 h-20 md:w-24 md:h-24 rounded-xl shadow-lg border border-purple-500/20 mb-3 object-cover"
											/>
											<span
												class="text-white font-bold text-sm line-clamp-1 w-full"
												title={opt.title}>{opt.title}</span
											>
											<span
												class="text-purple-300 text-xs line-clamp-1 w-full mt-0.5"
												title={opt.artist}>{opt.artist}</span
											>
										</div>
									{/each}
								</div>
								<!-- Standard Song Display -->
							{:else if currentScreen.mapName}
								<div class="flex items-center gap-5">
									<div class="relative flex-shrink-0">
										<img
											src={currentScreen.song.coverUrl}
											alt="cover"
											class="w-24 h-24 md:w-36 md:h-36 rounded-2xl shadow-xl border-2 border-purple-400/30 object-cover"
										/>
										<div
											class="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-2xl blur-md scale-110"
										></div>
									</div>
									<div>
										<div class="text-xl md:text-2xl font-bold text-white">
											{currentScreen.song.title}
										</div>
										<div class="text-purple-300 mt-1">{currentScreen.song.artist}</div>
										<!-- show song badge -->
										<SongBadge song={currentScreen.song} />
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/key}
			{/if}

			<!-- LIVE SCORES LEADERBOARD PANEL -->
			{#if liveScores && liveScores.length > 0}
				<div transition:fade={{ duration: 300 }} class="relative group screen-enter">
					<div
						class="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-3xl blur-xl transition-opacity duration-500"
					></div>
					<div
						class="relative bg-gray-800/50 backdrop-blur-xl border border-cyan-500/30 rounded-3xl p-6 md:p-8"
					>
						<div class="flex items-center gap-3 mb-6">
							<Activity class="w-6 h-6 text-cyan-400 animate-pulse" />
							<h2 class="text-xl font-bold text-white">Live Scores</h2>
							<span class="text-sm text-gray-400 mt-1"
								>Top {Math.min(5, liveScores.length)} of {liveScores.length}</span
							>
							<div
								class="ml-auto px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-white text-xs font-bold animate-pulse shadow-lg"
							>
								LIVE
							</div>
						</div>

						<div class="flex flex-col gap-3">
							{#each liveScores.slice(0, 5) as player (player.username)}
								{@const rankInfo = getRankIcon(player.rank)}
								<div
									animate:flip={{ duration: 400, easing: cubicOut }}
									class="group relative bg-gray-700/30 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-4 hover:border-cyan-400/50 transition-all duration-300 w-full text-left flex items-center gap-3"
								>
									<div class="relative flex items-center gap-3">
										<div class="relative">
											<div
												class="w-12 h-12 bg-gradient-to-r {rankInfo.bg} rounded-xl flex items-center justify-center"
											>
												<svelte:component this={rankInfo.icon} class="w-6 h-6 {rankInfo.color}" />
											</div>
											<div
												class="absolute -top-1 -right-1 w-6 h-6 {player.rank === 1
													? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
													: player.rank === 2
														? 'bg-gradient-to-r from-gray-300 to-gray-500'
														: player.rank === 3
															? 'bg-gradient-to-r from-amber-600 to-amber-800'
															: 'bg-gray-600'} rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
											>
												{player.rank}
											</div>
										</div>
									</div>

									<Avatar avatar={player.avatar} username={player.username} />

									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2 mb-1">
											<h4 class="font-semibold text-white truncate">{player.username}</h4>
											{#if player.country}
												<CountryFlag countryId={player.country} />
											{/if}
										</div>
										<div class="flex items-center gap-2 text-sm text-gray-400">
											<span class="text-white font-semibold font-mono tracking-wider">
												{formatAnimatedScore(displayScores[player.username] ?? player.score)}
											</span>
											<span class="flex items-center gap-1">
												<span class="{Utils.getStarsColorByScore(player.score)} font-semibold">
													{Utils.getStarsByScore(player.score)}
												</span>
											</span>
											<!-- {#if player.jdPoints}
												<span class="text-[10px] text-gray-500 hidden sm:inline">({player.jdPoints.toLocaleString()} JD Pts)</span>
											{/if} -->
										</div>
									</div>

									{#if player.platform}
										<div class="text-right ml-auto flex-shrink-0 hidden sm:block opacity-80">
											<div class="flex items-center gap-0 justify-end">
												<Icon
													icon={Utils.getPlatformIcon(player.platform)}
													inline={true}
													class="w-10 h-10 text-gray-300"
												/>
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			<!-- Upcoming screens -->
			{#if upcomingScreens.length > 0}
				<div>
					<div class="flex items-center gap-2 mb-3 px-1">
						<ChevronRight class="w-5 h-5 text-gray-400" />
						<h2 class="text-base font-semibold text-gray-300">Upcoming</h2>
					</div>
					<div class="flex flex-col gap-3 upcoming-list">
						{#each upcomingScreens as screen, i (screen.type + screen.startTime)}
							<div
								class="upcoming-item relative flex items-center gap-4 bg-gray-800/40 backdrop-blur-xl border border-gray-700/40 rounded-2xl p-4 hover:border-purple-400/30 transition-colors duration-300"
							>
								<div class="flex-shrink-0 w-6 text-center text-xs text-gray-500 font-bold">
									{i + 2}
								</div>

								<div
									class="flex-shrink-0 w-8 h-8 bg-gradient-to-r {screen.gradient} rounded-xl flex items-center justify-center shadow-md opacity-80"
								>
									<svelte:component this={screen.icon} class="w-4 h-4 text-white" />
								</div>

								{#if screen.mapName && (!screen.voteOptions || screen.voteOptions.length === 0)}
									<img
										src={screen.song.coverUrl}
										alt="cover"
										class="w-10 h-10 rounded-lg object-cover border border-gray-600/50 flex-shrink-0"
									/>
								{/if}

								<div class="flex-1 min-w-0">
									<div class="text-white text-sm font-medium truncate">{screen.label}</div>
									{#if screen.voteOptions && screen.voteOptions.length > 0}
										<div class="text-gray-400 text-xs truncate">
											Vote: {screen.voteOptions.map((o) => o.title).join(' vs ')}
										</div>
									{:else if screen.mapName}
										<div class="text-gray-400 text-xs truncate">
											{screen.song.title} · {screen.song.artist}
										</div>
									{/if}
								</div>

								<div class="flex-shrink-0 text-right text-xs text-gray-500 tabular-nums">
									~{Math.round((screen.endTime - screen.startTime) / 60)}m
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Tournament / Season -->
			{#if season}
				<div
					class="relative bg-gray-800/50 backdrop-blur-xl border border-yellow-500/30 rounded-3xl p-6 md:p-8"
				>
					<div
						class="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-3xl blur-xl"
					></div>
					<div class="relative">
						<div class="flex items-center gap-3 mb-5">
							<div class="relative">
								<div
									class="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg"
								>
									<Trophy class="w-5 h-5 text-white" />
								</div>
								<div
									class="absolute inset-0 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 rounded-xl blur-lg scale-125"
								></div>
							</div>
							<div>
								<div class="text-xs text-gray-400 uppercase tracking-wider">
									Season {season.seasonNumber}
								</div>
								<div class="text-white font-bold text-lg">Tournament</div>
							</div>
							{#if season.currentSeasonEndTime}
								<div class="ml-auto text-right">
									<div class="text-xs text-gray-400">Season ends</div>
									<div class="text-yellow-300 text-sm font-medium">
										{new Date(season.currentSeasonEndTime * 1000).toLocaleDateString(undefined, {
											month: 'short',
											day: 'numeric'
										})}
									</div>
								</div>
							{/if}
						</div>

						<div class="grid grid-cols-2 gap-3 mb-5">
							<div class="bg-gray-700/40 rounded-2xl p-4 text-center">
								<div class="text-2xl font-bold text-yellow-400">
									{(season.currentSeasonDancerCount ?? 0).toLocaleString()}
								</div>
								<div class="text-xs text-gray-400 mt-1">Dancers this Season</div>
							</div>
							<div class="bg-gray-700/40 rounded-2xl p-4 text-center">
								<div class="text-2xl font-bold text-orange-400">#{season.seasonNumber}</div>
								<div class="text-xs text-gray-400 mt-1">Current Season</div>
							</div>
						</div>

						{#if hasTournament}
							{@const winner = season.previousSeasonWinner}
							<div class="bg-gray-700/30 border border-yellow-500/20 rounded-2xl p-4">
								<div
									class="text-xs text-yellow-400 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2"
								>
									<Award class="w-3.5 h-3.5" />
									Previous Season Champion
								</div>
								<div class="flex items-center gap-4">
									<Avatar avatar={winner.dancer?.avatar} username={winner.dancer?.username} />

									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2 mb-1">
											<h4 class="font-bold text-white text-lg truncate">
												{winner.dancer?.username ?? '—'}
											</h4>
											{#if winner.dancer?.country}
												<CountryFlag countryId={winner.dancer.country} />
											{/if}
										</div>

										<div class="flex items-center gap-3 flex-wrap">
											<span class="text-yellow-300 text-sm font-medium">
												{(winner.wdfPoints ?? 0).toLocaleString()} WDF pts
											</span>
											{#if winner.dancer?.jdPoints}
												<span class="text-gray-400 text-xs">
													{winner.dancer.jdPoints.toLocaleString()} JD pts
												</span>
											{/if}
										</div>
									</div>

									{#if winner.dancer?.platform}
										<div class="text-right ml-auto flex-shrink-0 hidden sm:block">
											<div class="flex items-center justify-end opacity-80">
												<Icon
													icon={Utils.getPlatformIcon(winner.dancer.platform)}
													class="w-8 h-8 text-gray-300"
												/>
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.screen-enter {
		animation: screenEnter 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	@keyframes screenEnter {
		from {
			opacity: 0;
			transform: translateY(18px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.upcoming-item {
		animation: upcomingEnter 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	@keyframes upcomingEnter {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.countdown-urgent {
		animation: urgentPulse 0.6s ease-in-out infinite alternate;
	}
	@keyframes urgentPulse {
		from {
			opacity: 1;
		}
		to {
			opacity: 0.5;
		}
	}

	.morphing-tab-btn {
		border-radius: 1rem;
		transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.morphing-tab-btn:hover {
		border-radius: 0.75rem;
	}
	.morphing-tab-btn:active {
		border-radius: 1.5rem;
		transform: scale(0.98);
	}

	.animation-delay-2000 {
		animation-delay: 2s;
	}
	.animation-delay-4000 {
		animation-delay: 4s;
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
		background: linear-gradient(to bottom, #8b5cf6, #ec4899);
		border-radius: 3px;
	}
	::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(to bottom, #7c3aed, #db2777);
	}
</style>
