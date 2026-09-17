<script>
	import { page } from '$app/stores';
	import { derived } from 'svelte/store';
	import { tick, onMount, onDestroy } from 'svelte';
	import { user, logout } from '$lib/stores/user';
	import { goto } from '$app/navigation';
	import Avatar from './Shared/Avatar.svelte';
	import {
		Home, Activity, Megaphone, Medal, Earth, Spotlight, Users,
		BookMarked, Music, ListMusic, Download, Newspaper, Zap, UserStar,
		ChevronDown
	} from 'lucide-svelte';

	export let onNavigate = () => {};

	const currentPath = derived(page, ($page) => $page.url.pathname);

	const icons = {
		home: Home, updates: Megaphone, community: Users,
		leaderboard: Medal, wdf: Earth, spotlight: Spotlight, friends: Users,
		content: BookMarked, songs: Music, playlists: ListMusic, downloads: Download,
		admin: UserStar, users: Users, news: Newspaper, activities: Activity, jmcs: Zap,
	};

	let mobileMenuOpen = false;
	let navHidden = false;
	let lastScrollY = 0;
	const scrollThreshold = 20;
	let scrollHandler;

	onMount(() => {
		lastScrollY = window.scrollY;
		scrollHandler = () => {
			const currentScrollY = window.scrollY;
			const delta = currentScrollY - lastScrollY;
			if (Math.abs(delta) > scrollThreshold) {
				if (delta > 0 && currentScrollY > 80) { navHidden = true; }
				else if (delta < 0) { navHidden = false; }
			}
			lastScrollY = currentScrollY;
		};
		window.addEventListener('scroll', scrollHandler, { passive: true });
	});
	onDestroy(() => {
		if (scrollHandler) window.removeEventListener('scroll', scrollHandler);
	});

	const logoutUser = async () => {
		logout();
		await tick();
		location.reload();
	};

	const toggleMobileMenu = () => {
		mobileMenuOpen = !mobileMenuOpen;
	};

	const navItems = [
		{ label: 'Home', href: '/hub', icon: 'home' },
		{ label: 'Updates', href: '/hub/updates', icon: 'updates' },
		{
			label: 'Community', icon: 'community',
			items: [
				{ label: 'Leaderboard', href: '/hub/leaderboard', icon: 'leaderboard' },
				{ label: 'World Dance Floor', href: '/hub/wdf', icon: 'wdf' },
				{ label: 'Spotlight', href: '/hub/spotlight', icon: 'spotlight', new: true },
				{ label: 'Friends', href: '/hub/friends', icon: 'friends' },
			]
		},
		{
			label: 'Content', icon: 'content',
			items: [
				{ label: 'Songs', href: '/hub/songs', icon: 'songs' },
				{ label: 'Playlists', href: '/hub/playlists', icon: 'playlists' },
				{ label: 'Downloads', href: '/hub/downloads', icon: 'downloads' },
			]
		},
	];

	$: adminItems = $user?.isAdmin ? [
		{ label: 'Users', href: '/hub/admin/users', icon: 'users' },
		{ label: 'News', href: '/hub/admin/news', icon: 'news' },
		{ label: 'Activities', href: '/hub/admin/activities', icon: 'activities' },
		{ label: 'JMCS', href: '/hub/admin/jmcs-activities', icon: 'jmcs' },
	] : [];

	function navigate(href) {
		mobileMenuOpen = false;
		goto(href);
	}
</script>

<div class="fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out" class:-translate-y-full={navHidden}>
	<div class="mx-auto max-w-7xl px-4 pt-3">
		<nav class="relative bg-black/10 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/10 rounded-2xl">
			<div class="relative z-10 px-4 sm:px-6">
				<div class="flex items-center h-16">

					<!-- Logo -->
					<div class="flex items-center w-[180px] flex-shrink-0">
						<a href="/hub" class="flex items-center gap-3 group" on:click={onNavigate}>
							<img src="/assets/logos/jdm_logo.png" alt="JDMO" class="h-10 w-auto object-contain" />
						</a>
					</div>

					<!-- Desktop Navigation -->
					<div class="hidden lg:flex items-center gap-1 flex-1 justify-center">
						{#each navItems as item}
							{#if item.items}
								<!-- Dropdown -->
								<div class="relative group">
									<button
										class="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-1.5 text-white/70 hover:text-white hover:bg-white/10"
									>
										<svelte:component this={icons[item.icon]} width="16" height="16" />
										{item.label}
										<svg class="w-3 h-3 ml-0.5 transition-transform duration-200 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
										</svg>
									</button>
									<div class="absolute top-full left-0 mt-2 w-52 bg-black/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform group-hover:translate-y-0 -translate-y-2">
										<div class="p-2 space-y-0.5">
											{#each item.items as sub}
												<button
													on:click={() => navigate(sub.href)}
													class="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all duration-200 text-left"
												>
													<svelte:component this={icons[sub.icon]} width="16" height="16" />
													{sub.label}
													{#if sub.new}
														<span class="ml-auto px-1.5 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded text-blue-400 text-xs font-medium">NEW</span>
													{/if}
												</button>
											{/each}
										</div>
									</div>
								</div>
							{:else}
								<a
									href={item.href}
									on:click={onNavigate}
									class="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200
										{$currentPath === item.href
											? 'bg-white/15 text-white'
											: 'text-white/70 hover:text-white hover:bg-white/10'}"
								>
									<span class="flex items-center gap-2">
										<svelte:component this={icons[item.icon]} width="16" height="16" />
										{item.label}
									</span>
								</a>
							{/if}
						{/each}

						<!-- Admin dropdown -->
						{#if $user?.isAdmin && adminItems.length > 0}
							<div class="relative group">
								<button
									class="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-1.5 text-amber-400/70 hover:text-amber-300 hover:bg-white/10"
								>
									<svelte:component this={UserStar} width="16" height="16" />
									Admin
									<svg class="w-3 h-3 ml-0.5 transition-transform duration-200 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								</button>
								<div class="absolute top-full left-0 mt-2 w-52 bg-black/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform group-hover:translate-y-0 -translate-y-2">
									<div class="p-2 space-y-0.5">
										{#each adminItems as sub}
											<button
												on:click={() => navigate(sub.href)}
												class="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all duration-200 text-left"
											>
												<svelte:component this={icons[sub.icon]} width="16" height="16" />
												{sub.label}
											</button>
										{/each}
									</div>
								</div>
							</div>
						{/if}
					</div>

					<!-- Right Side -->
					<div class="hidden lg:flex items-center justify-end gap-2 w-[180px] flex-shrink-0">
						{#if $user}
							<div class="relative group">
								<button class="flex items-center gap-2 px-3 py-1.5 text-sm text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all duration-200">
									<Avatar avatar={$user.avatarId} username={$user.username} isOnline={true} size="w-7 h-7" />
									<span class="font-medium">{$user.username || 'User'}</span>
									<svg class="w-3.5 h-3.5 transform group-hover:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
									</svg>
								</button>
								<div class="absolute top-full right-0 mt-2 w-48 bg-black/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform group-hover:translate-y-0 -translate-y-2">
									<div class="p-2 space-y-0.5">
										<a href="/hub/profile" on:click={onNavigate} class="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all duration-200">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
											</svg>
											Profile
										</a>
										<div class="border-t border-white/10 my-1.5"></div>
										<button on:click={logoutUser} class="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 rounded-xl hover:bg-white/10 transition-all duration-200">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
											</svg>
											Logout
										</button>
									</div>
								</div>
							</div>
						{:else}
							<a href="/login" class="px-4 py-2 text-sm font-medium text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all duration-200">Login</a>
							<a href="/login?r=true" class="px-5 py-2 text-sm font-medium bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl shadow-lg">Register</a>
						{/if}
					</div>

					<!-- Mobile Menu Button -->
					<button
						aria-label="Toggle menu"
						class="lg:hidden ml-auto p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-200"
						on:click={toggleMobileMenu}
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
						</svg>
					</button>
				</div>
			</div>
		</nav>

		<!-- Mobile Menu -->
		{#if mobileMenuOpen}
			<div class="lg:hidden mt-2 bg-black/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 animate-slide-down">
				<div class="p-3 space-y-1">
					{#if $user}
						<div class="flex items-center gap-3 px-3 py-3 border-b border-white/10 mb-1">
							<Avatar avatar={$user.avatarId} username={$user.username} isOnline={true} size="w-9 h-9" />
							<div>
								<p class="text-sm font-medium text-white">{$user.username || 'User'}</p>
							</div>
						</div>
					{/if}
					{#each navItems as item}
						{#if item.items}
							{#each item.items as sub}
								<button
									on:click={() => navigate(sub.href)}
									class="flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all duration-200 w-full text-left"
								>
									<svelte:component this={icons[sub.icon]} width="16" height="16" />
									{sub.label}
									{#if sub.new}
										<span class="ml-auto px-1.5 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded text-blue-400 text-xs font-medium">NEW</span>
									{/if}
								</button>
							{/each}
						{:else}
							<button
								on:click={() => navigate(item.href)}
								class="flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all duration-200 w-full text-left"
							>
								<svelte:component this={icons[item.icon]} width="16" height="16" />
								{item.label}
							</button>
						{/if}
					{/each}
					{#if $user?.isAdmin}
						<div class="border-t border-white/10 pt-2 mt-2">
							<p class="px-3 py-1 text-xs font-semibold text-amber-400/60 uppercase tracking-wider">Admin</p>
							{#each adminItems as sub}
								<button
									on:click={() => navigate(sub.href)}
									class="flex items-center gap-3 px-3 py-2.5 text-sm text-amber-400/70 hover:text-amber-300 rounded-xl hover:bg-white/10 transition-all duration-200 w-full text-left"
								>
									<svelte:component this={icons[sub.icon]} width="16" height="16" />
									{sub.label}
								</button>
							{/each}
						</div>
					{/if}
					{#if $user}
						<div class="border-t border-white/10 pt-2 mt-2">
							<a href="/hub/profile" on:click={onNavigate} class="flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all duration-200" on:click={toggleMobileMenu}>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
								</svg>
								Profile
							</a>
							<button on:click={() => { logoutUser(); toggleMobileMenu(); }} class="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 rounded-xl hover:bg-white/10 transition-all duration-200">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
								</svg>
								Logout
							</button>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<div class="h-20"></div>
