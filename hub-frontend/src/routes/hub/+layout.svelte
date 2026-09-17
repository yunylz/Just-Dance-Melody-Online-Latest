<script>
	import { onMount } from 'svelte';
	import { user, login } from '$lib/stores/user';
	import { goto, afterNavigate } from '$app/navigation';
	import API from '$lib/api.js';
	import Sidebar from '$lib/components/Hub/Sidebar.svelte';
	import MobileNav from '$lib/components/Hub/MobileNav.svelte';
	import InstallBanner from '$lib/components/Hub/InstallBanner.svelte';
	import PushBanner from '$lib/components/Hub/PushBanner.svelte';
	import UpdateBanner from '$lib/components/Hub/UpdateBanner.svelte';
	import { Loader2 } from 'lucide-svelte';
	import GlobalPopup from '$lib/components/Hub/Shared/GlobalPopup.svelte';

	let loading = true;
	let isMobile = false;
	let sidebarCollapsed = false;

	onMount(() => {
		const ua = navigator.userAgent || navigator.vendor || window.opera;
		isMobile = /android|iphone|ipad|ipod|opera mini|iemobile|wpdesktop/i.test(ua) || new URL(window.location.href).searchParams.get('mobile') === 'true';

		const saved = localStorage.getItem('sidebarCollapsed');
		if (saved !== null && !isMobile) {
			sidebarCollapsed = JSON.parse(saved);
		} else if (isMobile) {
			sidebarCollapsed = true;
		}
	});

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
		if (!isMobile) {
			localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
		}
	}

	function handleSidebarNavigate() {
		// no-op for desktop
	}

	let scrollContainer;

	afterNavigate(() => {
		if (scrollContainer) {
			scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
		}
	});

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		const tParam = params.get('t');
		if (tParam) {
			try {
				const decoded = atob(tParam);
				localStorage.setItem('authToken', decoded);
				params.delete('t');
				const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
				window.history.replaceState({}, '', newUrl);
			} catch (e) {
				console.error('Failed to decode launcher token:', e);
			}
		}

		const token = localStorage.getItem('authToken');

		try {
			await API.assureItems();
		} catch (e) {
			console.error('Failed to load JMCS items:', e);
		}

		if (token && !$user) {
			try {
				const userData = await API.getCurrentUser();
				if (userData) {
					login({
						userId: userData.userId,
						username: userData.username,
						email: userData.email,
						country: userData.country || null,
						dateOfBirth: userData.dateOfBirth || null,
						firstName: userData.firstName || null,
						lastName: userData.lastName || null,
						gender: userData.gender || null,
						preferredLanguage: userData.preferredLanguage || 'en',
						accountType: userData.accountType || 'Hub',
						ageGroup: userData.ageGroup || 'adult',
						dateCreated: userData.dateCreated,
						avatar: API.getAvatarUrl(userData.avatarId || 1),
						avatarId: userData.avatarId || 1,
						notifications: userData.notifications || 0,
						profiles: userData.profiles || [],
						hubSettings: userData.hubSettings || {},
						status: userData.status || {},
						isAdmin: userData.status.admin == true || false
					});
				} else {
					localStorage.removeItem('authToken');
					goto('/login');
				}
			} catch (error) {
				if (error.code === 86) {
					goto('/hub/profile?setup2fa=true');
					return;
				}
				console.error('Failed to restore user session:', error);
				localStorage.removeItem('authToken');
				goto('/login');
			}
		} else if (!token) {
			goto('/login');
		}
		loading = false;
	});

	$: currentUser = $user;

	let heartbeatInterval;
	function startHeartbeat() {
		if (heartbeatInterval) return;
		API.ping();
		heartbeatInterval = setInterval(() => {
			if ($user) { API.ping(); }
			else { stopHeartbeat(); }
		}, 3 * 60 * 1000);
	}
	function stopHeartbeat() {
		if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
	}
	onMount(() => { return () => stopHeartbeat(); });
	$: if ($user) { startHeartbeat(); } else { stopHeartbeat(); }
</script>

{#if loading}
	<div class="flex items-center justify-center min-h-screen" style="background: {$user?.hubSettings?.theme === 'light' ? 'bg-brand-gradient' : 'linear-gradient(135deg, #111827, #1e1035, #111827)'}">
		<div class="text-center text-gray-400">
			<Loader2 class="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
			<p>Loading...</p>
		</div>
	</div>
{:else if currentUser}
	<div
		class="flex h-screen overflow-hidden"
		style="background: {$user?.hubSettings?.theme === 'light' ? 'linear-gradient(135deg, #972ca5, #7c3aed, #4444d4)' : 'linear-gradient(135deg, #111827, #1e1035, #111827)'}"
	>
		<!-- Desktop sidebar -->
		<div class="hidden md:block relative sticky top-0 flex-shrink-0 h-screen transition-all duration-500 {sidebarCollapsed ? 'w-20' : 'w-80'}">
			<Sidebar collapsed={sidebarCollapsed} onNavigate={handleSidebarNavigate} />

			<!-- Collapse toggle pill -->
			<button
				on:click={toggleSidebar}
				aria-label="Toggle sidebar"
				class="absolute top-1/2 -right-4 -translate-y-1/2 z-50
				       w-8 h-8 rounded-full border-2 border-gray-800
				       bg-gradient-to-r from-purple-500 to-pink-500
				       flex items-center justify-center shadow-lg
				       hover:scale-110 hover:shadow-xl transition-all duration-300 group"
			>
				<div
					class="absolute inset-0 rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity duration-300 bg-gradient-to-r from-purple-400 to-pink-400"
				></div>
				<svg
					class="w-4 h-4 text-white relative z-10 transition-transform duration-300 {sidebarCollapsed ? 'rotate-180' : ''}"
					fill="none" stroke="currentColor" viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
		</div>

		<!-- Content area -->
		<div
			bind:this={scrollContainer}
			class="flex-1 h-screen overflow-y-auto pb-20 md:pb-0 md:p-6"
		>
			<div class="p-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] md:p-0">
				<UpdateBanner />
				<InstallBanner />
				<PushBanner />
				<slot />
			</div>
		</div>

		<MobileNav />
	</div>
	<GlobalPopup />
{:else}
	<div class="flex items-center justify-center min-h-screen" style="background: {$user?.hubSettings?.theme === 'light' ? 'linear-gradient(135deg, #972ca5, #7c3aed, #4444d4)' : 'linear-gradient(135deg, #111827, #1e1035, #111827)'}">
		<div class="text-center text-gray-400"></div>
	</div>
{/if}
