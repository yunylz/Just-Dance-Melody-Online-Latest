<script>
	import Logo from '../Logo.svelte';
	import {
		Home,
		Activity,
		Megaphone,
		Settings,
		Medal,
		Trophy,
		Earth,
		Newspaper,
		Users,
		Zap,
		ChevronDown,
		ChevronRight,
		Handshake,
		BookMarked,
		UserStar,
		Video,
		Spotlight,
		Gift,
		ListMusic,
		Music,
		Star,
		Download,
		Gamepad2
	} from 'lucide-svelte';

	import { page } from '$app/stores';
	import { derived } from 'svelte/store';
	import Icon from '@iconify/svelte';
	import { user, logout } from '$lib/stores/user';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	import API from '$lib/api.js';

	import colors from '$lib/colors';
	import theme from '$lib/theme.js';
	import { jmcsItems } from '$lib/stores/jmcs';
	import Avatar from './Shared/Avatar.svelte';
	import { isTauri as isTauriRuntime } from '$lib/tauri.js';

	export let collapsed = false;
	// Called when a nav link is tapped — lets the parent layout close the mobile drawer
	export let onNavigate = () => {};

	import { notifications, unreadCount } from '$lib/stores/notifications.js';

	// Server info state
	let serverInfo = null;
	let appVersion = null;
	let isLoading = true;

	// Section collapse states
	let expandedSections = {
		community: true,
		content: true,
		admin: true
	};

	async function fetchNotifications() {
		if (!localStorage.getItem('authToken')) return;
		await notifications.fetch();
	}

	onMount(async () => {
		// Fetch server info on mount
		try {
			serverInfo = await API.getServerInfo();
		} catch (error) {
			console.error('Failed to fetch server info:', error);
		} finally {
			isLoading = false;
		}

		// In the desktop app, show the local Tauri app version instead of the server's
		if (isTauriRuntime()) {
			try {
				const { getVersion } = await import('@tauri-apps/api/app');
				appVersion = await getVersion();
			} catch (error) {
				console.error('Failed to fetch Tauri app version:', error);
			}
		}

		await fetchNotifications();
		// Optional: poll every 10 seconds
		const interval = setInterval(fetchNotifications, 15000);
		return () => clearInterval(interval);
	});

	let navigationSections = [
		{ name: 'Home', href: '/hub', icon: Home, gradient: colors.home },
		{ name: 'Updates', href: '/hub/updates', icon: Megaphone, gradient: colors.news },
		{
			name: 'Games',
			href: '/hub/games',
			icon: Gamepad2,
			gradient: colors.games,
			forMobile: false,
			forTauri: true
		},
		{
			id: 'community',
			name: 'Community',
			icon: Users,
			items: [
				{
					name: 'Leaderboard',
					href: '/hub/leaderboard',
					icon: Medal,
					gradient: colors.leaderboard
				},
				{ name: 'World Dance Floor', href: '/hub/wdf', icon: Earth, gradient: colors.wdf },
				{
					name: 'Spotlight',
					href: '/hub/spotlight',
					icon: Spotlight,
					gradient: colors.spotlight,
					new: true
				},
				{ name: 'Friends', href: '/hub/friends', icon: Users, gradient: colors.users }
			]
		},
		{
			id: 'content',
			name: 'Content',
			icon: BookMarked,
			items: [
				// TODO: maybe we will use this in feature...
				// { name: 'News', href: '/hub/news', icon: Newspaper, gradient: colors.news },
				// { name: 'Autodances', href: '/hub/autodances', icon: Video, gradient: colors.autodances }
				{ name: 'Songs', href: '/hub/songs', icon: Music, gradient: colors.autodances },
				{
					name: 'Playlists',
					href: '/hub/playlists',
					icon: ListMusic,
					gradient: colors.playlists
				}
			]
		},
		{
			id: 'admin',
			name: 'Admin Tools',
			icon: UserStar,
			adminsOnly: true,
			items: [
				{
					name: 'Users',
					href: '/hub/admin/users',
					icon: Users,
					gradient: colors.users,
					adminsOnly: true
				},
				{
					name: 'Editorial News',
					href: '/hub/admin/news',
					icon: Newspaper,
					gradient: colors.news,
					adminsOnly: true
				},
				{
					name: 'Admin Activities',
					href: '/hub/admin/activities',
					icon: Activity,
					gradient: colors.home,
					adminsOnly: true
				},
				{
					name: 'JMCS Activities',
					href: '/hub/admin/jmcs-activities',
					icon: Zap,
					gradient: colors.spotlight,
					adminsOnly: true
				}
			]
		}
	];

	// Filter navigation sections based on admin status and Tauri-only items
	$: filteredNavigationSections = navigationSections
		.filter((section) => {
			// If section requires admin, only show if user is admin
			if (section.adminsOnly) return $user && $user.isAdmin;
			return true;
		})
		.map((section) => {
			// Top-level items (no sub-items) get filtered individually too
			if (!section.items) return shouldShowItem(section) ? section : null;
			// Remove items hidden on this platform (Tauri-only / web-only)
			return { ...section, items: section.items.filter((item) => shouldShowItem(item)) };
		})
		.filter((section) => section !== null)
		// Drop sections that end up with no visible items
		.filter((section) => !section.items || section.items.length > 0);

	const currentPath = derived(page, ($page) => $page.url.pathname);

	function toggleSection(sectionId) {
		if (!collapsed) {
			expandedSections[sectionId] = !expandedSections[sectionId];
		}
	}

	function handleLogout() {
		logout();
		goto('/login');
	}

	function isSectionActive(section) {
		return !collapsed && section.items?.some((item) => $currentPath === item.href);
	}

	// Helper function to check if an item should be visible
	function shouldShowItem(item) {
		// Tauri-only items: hide on web
		if (item.forTauri === true && !isTauriRuntime()) return false;
		// Items explicitly marked forTauri:false: hide inside the desktop app
		if (item.forTauri === false && isTauriRuntime()) return false;
		// Admin-only items
		if (item.adminsOnly) return $user && $user.isAdmin;
		return true;
	}
</script>

<div
	class="relative flex flex-col h-full w-full {collapsed
		? 'p-3'
		: 'p-4 md:p-6'} overflow-x-hidden transition-all duration-500"
>
	<!-- Loading state -->
	{#if isLoading}
		<div
			class="absolute inset-0 flex items-center justify-center bg-gray-900/95 backdrop-blur-xl z-50"
		>
			<svg
				class="animate-spin w-12 h-12 mx-auto mb-3 text-purple-400"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		</div>
	{/if}

	<!-- Glassmorphism background -->
	<div
		class="absolute inset-0 backdrop-blur-xl border-r border-pink-500/20"
		style="background: {$user?.hubSettings?.theme === 'light'
			? 'linear-gradient(135deg, #972ca5, #7c3aed, #4444d4)'
			: 'linear-gradient(180deg, #111827, #1a1035)'}; backdrop-filter: blur(12px)"
	></div>

	<!-- Content with relative positioning and proper height constraints -->
	<div class="relative flex flex-col h-full min-h-0 z-10">
		<!-- Logo Section -->
		<div class="flex-shrink-0 mb-4 pt-2 flex flex-col items-center">
			<div class="group relative w-full">
				<!-- Logo glow effect -->
				<div
					class="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
				></div>

				<!-- Brand text -->
				<div class="text-center mt-(-5rem) relative">
					{#if collapsed}
						<div
							class="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg mx-auto"
						>
							<img
								src="/assets/logos/jdm_logo.png"
								alt="JDMO Logo"
								class="w-8 mx-auto drop-shadow-2xl transform hover:scale-105 transition-transform duration-300"
							/>
						</div>
					{:else}
						<div class="animate-fade-up animation-delay-300">
							<img
								src="/assets/logos/jdm_logo.png"
								alt="JDMO Logo"
								class="w-32 mx-auto drop-shadow-2xl transform hover:scale-105 transition-transform duration-300"
							/>
						</div>
					{/if}
					<!-- App / Server version -->
					{#if !collapsed}
						<div class="flex justify-center mt-3 mb-1">
							{#if isTauriRuntime() && appVersion}
								<span
									class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-gray-400 bg-gray-800/40 border border-gray-700/40"
								>
									<!-- <span class="w-1.5 h-1.5 rounded-full bg-purple-400/70"></span> -->
									v{appVersion}
								</span>
							{:else if serverInfo}
								<span
									class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] text-gray-400 bg-gray-800/40 border border-gray-700/40"
								>
									v{serverInfo.version}
								</span>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Categorized Navigation Menu -->
		<nav
			class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain space-y-2 mb-4 px-6 -mx-6 pt-2 pb-2"
		>
			{#each filteredNavigationSections as section, sectionIndex}
				<div
					class="transform transition-all duration-300"
					style="animation-delay: {sectionIndex * 150}ms"
				>
					<!-- Standalone Navigation Item or Section Header -->
					{#if !section.items}
						<div
							class="transform transition-all duration-300 relative z-20"
							style="animation-delay: {sectionIndex * 150}ms"
						>
							<a
								href={section.href}
								on:click={onNavigate}
								class="group relative morphing-nav-btn flex items-center {collapsed
									? 'justify-center px-3 py-4'
									: 'justify-between gap-4 px-6 py-3'} rounded-xl transition-all duration-500 cursor-pointer
									   {$currentPath === section.href
									? 'bg-gradient-to-r ' +
										section.gradient +
										' text-white font-semibold shadow-xl scale-105'
									: 'bg-gray-800/30 backdrop-blur-sm border border-gray-700/40 hover:border-purple-400/50 hover:bg-gray-700/40 text-gray-200 hover:text-white transform hover:scale-105 hover:-translate-y-0.5'}"
								title={collapsed ? section.name : ''}
							>
								<!-- Active glow effect -->
								{#if $currentPath === section.href}
									<div
										class="absolute inset-0 bg-gradient-to-r {section.gradient} opacity-10 animate-pulse"
									></div>
								{/if}

								<!-- Hover glow effect -->
								<div
									class="absolute inset-0 bg-gradient-to-r {section.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300"
								></div>

								<!-- Content -->
								<div
									class="relative z-10 flex items-center {collapsed ? 'justify-center' : 'gap-4'}"
								>
									<!-- Icon with styling -->
									<div class="relative">
										<svelte:component
											this={section.icon}
											class="w-5 h-5 transition-transform duration-300 group-hover:scale-110 {$currentPath ===
											section.href
												? 'drop-shadow-lg'
												: ''}"
										/>
										<!-- Icon background glow for active state -->
										{#if $currentPath === section.href}
											<div
												class="absolute inset-0 bg-white/20 rounded-full blur-sm scale-150"
											></div>
										{/if}
									</div>

									<!-- Text - hidden when collapsed -->
									{#if !collapsed}
										<span class="font-medium text-sm">{section.name}</span>
									{/if}
								</div>

								<!-- Updates badge for Updates -->
								{#if section.name === 'Updates' && $unreadCount > 0 && !collapsed}
									<div class="relative z-10">
										<div
											class="relative bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse"
										>
											{$unreadCount}
											<!-- Badge glow -->
											<div
												class="absolute inset-0 bg-gradient-to-r from-pink-400 to-red-400 rounded-full blur-sm opacity-50"
											></div>
										</div>
									</div>
								{/if}

								<!-- Hover shimmer effect -->
								<div
									class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
								>
									<div
										class="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 animate-shimmer"
									></div>
								</div>
							</a>
						</div>
					{:else}
						<!-- Section Header -->
						{#if !collapsed}
							<button
								on:click={() => toggleSection(section.id)}
								class="group relative section-header w-full flex items-center justify-between px-4 py-3 mb-2 rounded-xl transition-all duration-300 cursor-pointer z-20
									   {isSectionActive(section)
									? 'bg-gray-700/30 border border-gray-500/30 text-white'
									: 'bg-gray-800/20 backdrop-blur-sm border border-gray-700/30 hover:border-gray-600/50 hover:bg-gray-700/30 text-gray-300 hover:text-white'}"
							>
								<div class="flex items-center gap-3">
									<svelte:component
										this={section.icon}
										class="w-5 h-5 transition-transform duration-300 {isSectionActive(section)
											? 'text-white drop-shadow-lg'
											: ''}"
									/>
									<span class="font-medium text-sm tracking-wide">{section.name}</span>
									{#if section.adminsOnly}
										<span
											class="px-1.5 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded text-blue-400 text-xs font-medium whitespace-nowrap"
										>
											Admin
										</span>
									{/if}
								</div>
								<svelte:component
									this={expandedSections[section.id] ? ChevronDown : ChevronRight}
									class="w-4 h-4 transition-transform duration-300"
								/>
							</button>
						{/if}

						<!-- Section Items -->
						<div
							class="space-y-1 {collapsed ? '' : expandedSections[section.id] ? 'block' : 'hidden'}"
						>
							{#each section.items as link, itemIndex}
								{#if shouldShowItem(link)}
									<div
										class="transform transition-all duration-300 relative z-20"
										style="animation-delay: {sectionIndex * 150 + itemIndex * 50}ms"
									>
										<a
											href={link.href}
											on:click={onNavigate}
											class="group relative morphing-nav-btn flex items-center {collapsed
												? 'justify-center px-3 py-4'
												: 'justify-between gap-4 px-6 py-3 ml-2'} rounded-xl transition-all duration-500 cursor-pointer
												   {$currentPath === link.href
												? 'bg-gradient-to-r ' +
													link.gradient +
													' text-white font-semibold shadow-xl scale-105'
												: 'bg-gray-800/30 backdrop-blur-sm border border-gray-700/40 hover:border-purple-400/50 hover:bg-gray-700/40 text-gray-200 hover:text-white transform hover:scale-105 hover:-translate-y-0.5'}"
											title={collapsed ? link.name : ''}
										>
											<!-- Active glow effect -->
											{#if $currentPath === link.href}
												<div
													class="absolute inset-0 bg-gradient-to-r {link.gradient} opacity-10 animate-pulse"
												></div>
											{/if}

											<!-- Hover glow effect -->
											<div
												class="absolute inset-0 bg-gradient-to-r {link.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300"
											></div>

											<!-- Content -->
											<div
												class="relative z-10 flex items-center {collapsed
													? 'justify-center'
													: 'gap-4'}"
											>
												<!-- Icon with styling -->
												<div class="relative">
													<svelte:component
														this={link.icon}
														class="w-5 h-5 transition-transform duration-300 group-hover:scale-110 {$currentPath ===
														link.href
															? 'drop-shadow-lg'
															: ''}"
													/>
													<!-- Icon background glow for active state -->
													{#if $currentPath === link.href}
														<div
															class="absolute inset-0 bg-white/20 rounded-full blur-sm scale-150"
														></div>
													{/if}
												</div>

												<!-- Text - hidden when collapsed -->
												{#if !collapsed}
													<span class="font-medium text-sm">{link.name}</span>
													{#if link.new}
														<span
															class="px-1.5 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded text-blue-400 text-xs font-medium whitespace-nowrap ml-auto"
														>
															NEW
														</span>
													{/if}
													{#if link.adminsOnly}
														<span
															class="px-1.5 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded text-blue-400 text-xs font-medium whitespace-nowrap ml-auto"
														>
															Admin
														</span>
													{/if}
												{/if}
											</div>

											<!-- Updates badge for Updates -->
											{#if link.name === 'Updates' && newCount > 0 && !collapsed}
												<div class="relative z-10">
													<div
														class="relative bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse"
													>
														{newCount}
														<!-- Badge glow -->
														<div
															class="absolute inset-0 bg-gradient-to-r from-pink-400 to-red-400 rounded-full blur-sm opacity-50"
														></div>
													</div>
												</div>
											{/if}

											<!-- Hover shimmer effect -->
											<div
												class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
											>
												<div
													class="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 animate-shimmer"
												></div>
											</div>
										</a>
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</nav>

		<!-- Profile Section -->
		<div class="flex-shrink-0 space-y-4">
			<!-- Main Profile Card -->
			{#if $user}
				<a
					href="/hub/profile"
					on:click={onNavigate}
					class="group relative morphing-profile-btn flex items-center {collapsed
						? 'justify-center px-4 py-4'
						: 'gap-4 px-6 py-4'} rounded-2xl transition-all duration-500 cursor-pointer z-20
{$currentPath === '/hub/profile'
						? 'bg-brand-gradient-bkg text-white font-semibold shadow-2xl'
						: 'bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 hover:border-purple-400/50 hover:bg-gray-700/50 text-gray-200 hover:text-white transform hover:scale-105 hover:-translate-y-1'}"
					title={collapsed ? $user.username : ''}
				>
					<!-- Profile glow effects -->
					<div
						class="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
					></div>
					<!-- Profile content -->
					<div class="relative z-10 flex items-center {collapsed ? 'justify-center' : 'gap-4'}">
						<!-- avatar -->
						<div class="relative">
							<Avatar
								avatar={$user.avatarId}
								username={$user.username}
								isOnline={true}
								size={collapsed ? 'w-6 h-6' : 'w-12 h-12'}
							/>
						</div>
						<!-- User info - hidden when collapsed -->
						{#if !collapsed}
							<div class="flex-1 min-w-0">
								<div class="font-semibold text-base flex items-center gap-2">
									<span class="truncate">{$user.username}</span>
									{#if $user.isAdmin}
										<!-- Option 1: Minimal badge -->
										<span
											class="px-1.5 py-0.5 bg-blue-900/20 border border-blue-400/30 rounded text-blue-100 text-xs font-medium whitespace-nowrap"
										>
											Admin
										</span>
									{/if}
								</div>
								<div class="text-sm opacity-75 truncate">
									{$currentPath === '/hub/profile' ? '' : 'View Profile'}
								</div>
							</div>
						{/if}
					</div>
					<!-- Profile shimmer effect -->
					<div
						class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
					>
						<div
							class="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 animate-shimmer"
						></div>
					</div>
				</a>
			{:else}
				<div class="text-center text-gray-400">
					{#if !collapsed}
						Not logged in
					{:else}
						<div class="w-10 h-10 bg-gray-700 rounded-full mx-auto"></div>
					{/if}
				</div>
			{/if}

			<!-- Settings Link -->
			<!-- <a
				href="/hub/settings"
				class="group relative morphing-nav-btn flex items-center {collapsed
					? 'justify-center px-3 py-3'
					: 'justify-between gap-4 px-6 py-3'} rounded-2xl transition-all duration-500 cursor-pointer z-20
					   {$currentPath === '/hub/settings'
					? 'bg-gradient-to-r from-gray-600 to-gray-500 text-white font-semibold'
					: 'bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 hover:border-gray-500/50 hover:bg-gray-700/40 text-gray-300 hover:text-white transform hover:scale-105'}"
				title={collapsed ? 'Settings' : ''}
			>
				<div class="relative z-10 flex items-center {collapsed ? 'justify-center' : 'gap-4'}">
					<Settings
						class="w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90"
					/>
					{#if !collapsed}
						<span class="font-medium">Settings</span>
					{/if}
				</div>
			</a> -->

			<!-- Logout Button -->
			{#if $user}
				<button
					on:click={handleLogout}
					class="group relative morphing-logout-btn flex items-center {collapsed
						? 'justify-center px-3 py-3'
						: 'gap-4 px-6 py-3'} mt-3 rounded-2xl w-full transition-all duration-500 cursor-pointer z-20
						   bg-gray-800/30 backdrop-blur-sm border border-red-700/30 hover:border-red-500/50 hover:bg-red-900/20 text-red-400 hover:text-red-300 transform hover:scale-105"
					title={collapsed ? 'Log Out' : ''}
				>
					<!-- Logout glow effect -->
					<div
						class="absolute inset-0 bg-gradient-to-r from-red-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
					></div>

					<!-- Logout content -->
					<div class="relative z-10 flex items-center {collapsed ? 'justify-center' : 'gap-4'}">
						<Icon
							icon="mdi-light:logout"
							class="w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-x-1"
						/>
						{#if !collapsed}
							<span class="font-medium">Log Out</span>
						{/if}
					</div>

					<!-- Logout hover effect -->
					<div
						class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
					>
						<div
							class="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-red-500/10 to-transparent transform -skew-x-12 animate-shimmer"
						></div>
					</div>
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Prevent horizontal scrolling on the main container */
	:global(.relative.flex-col.h-screen) {
		overflow-x: hidden !important;
	}

	/* Ensure nav and its children don't cause horizontal overflow */
	nav {
		overflow-x: hidden;
	}

	/* Section Header Styles */
	.section-header {
		border-radius: 0.75rem;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		z-index: 20;
	}

	.section-header:hover {
		border-radius: 0.5rem;
	}

	.section-header:active {
		border-radius: 1rem;
		transform: scale(0.98);
	}

	/* Morphing Button Effects */
	.morphing-nav-btn {
		border-radius: 0.75rem;
		transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		z-index: 20;
		overflow: visible;
	}

	.morphing-nav-btn:hover {
		border-radius: 0.5rem;
	}

	.morphing-nav-btn:active {
		border-radius: 1rem;
		transform: scale(0.98);
	}

	.morphing-profile-btn {
		border-radius: 1rem;
		transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		z-index: 20;
		overflow: visible;
	}

	.morphing-profile-btn:hover {
		border-radius: 0.5rem;
	}

	.morphing-profile-btn:active {
		border-radius: 1.75rem;
		transform: scale(0.98);
	}

	.morphing-logout-btn {
		border-radius: 1rem;
		transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		z-index: 20;
		overflow: visible;
	}

	.morphing-logout-btn:hover {
		border-radius: 0.75rem;
	}

	.morphing-logout-btn:active {
		border-radius: 1.5rem;
		transform: scale(0.98);
	}

	/* Animation delays */
	.animation-delay-1000 {
		animation-delay: 1s;
	}
	.animation-delay-1500 {
		animation-delay: 1.5s;
	}
	.animation-delay-2000 {
		animation-delay: 2s;
	}
	.animation-delay-3000 {
		animation-delay: 3s;
	}
	.animation-delay-4000 {
		animation-delay: 4s;
	}
	.animation-delay-5000 {
		animation-delay: 5s;
	}

	/* Shimmer animation */
	@keyframes shimmer {
		0% {
			transform: translateX(-100%) skewX(-12deg);
		}
		100% {
			transform: translateX(200%) skewX(-12deg);
		}
	}

	.animate-shimmer {
		animation: shimmer 2s ease-in-out infinite;
	}

	/* hover effects */
	.morphing-nav-btn::before,
	.section-header::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
		transition: left 0.6s;
		z-index: 1;
	}

	.morphing-nav-btn:hover::before,
	.section-header:hover::before {
		left: 100%;
	}

	/* Staggered entrance animations */
	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(-20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.morphing-nav-btn,
	.section-header {
		animation: slideIn 0.6s ease-out forwards;
	}

	/* Section expansion animation */
	@keyframes expandSection {
		from {
			opacity: 0;
			max-height: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			max-height: 300px;
			transform: translateY(0);
		}
	}

	/* Custom scrollbar for the sidebar */
	::-webkit-scrollbar {
		width: 6px;
	}

	::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.1);
		border-radius: 3px;
	}

	::-webkit-scrollbar-thumb {
		background: linear-gradient(to bottom, #e25cf6, #cc2782);
		border-radius: 3px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(to bottom, #ed3adb, #c927db);
	}

	/* Ensure glow effects don't cause overflow */
	.morphing-nav-btn > div.absolute,
	.morphing-profile-btn > div.absolute,
	.morphing-logout-btn > div.absolute {
		pointer-events: none;
	}
</style>
