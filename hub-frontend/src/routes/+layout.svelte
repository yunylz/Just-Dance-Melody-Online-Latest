<script>
	import '../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { user, login } from '$lib/stores/user';
	import API from '$lib/api.js';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { goto } from '$app/navigation';
	import { isTauri as isTauriRuntime } from '$lib/tauri.js';
	import DownloadDesktopModal from '$lib/components/DownloadDesktopModal.svelte';

	let isTauri = false;
	let open;

	onMount(async () => {
		if (!isTauriRuntime()) {
			isTauri = false;
			return;
		}

		try {
			const { openUrl } = await import('@tauri-apps/plugin-opener');
			isTauri = true;
		} catch (error) {
			console.error('Failed to load Tauri opener plugin:', error);
			isTauri = false;
		}
	});

	/** Handle an incoming deep-link URL, e.g. jdmo://auth/callback?token=... */
	async function handleDeepLink(urls) {
		for (const urlStr of urls) {
			try {
				const url = new URL(urlStr);
				if (url.pathname === '/auth/callback' || urlStr.startsWith('jdmo://auth/callback')) {
					const tokenParam = url.searchParams.get('token');
					const error = url.searchParams.get('error');
					const success = url.searchParams.get('success');

					if (tokenParam) {
						const apiToken = decodeURIComponent(tokenParam);
						localStorage.setItem('authToken', apiToken);
						goto(`/auth/callback?token=${encodeURIComponent(apiToken)}`);
						return;
					}

					if (error) {
						goto(`/auth/callback?error=${error}`);
						return;
					}

					if (success) {
						goto(`/auth/callback?success=${success}`);
						return;
					}
				}
			} catch (e) {
				console.error('Failed to handle deep link:', e);
			}
		}
	}

	let authLoading = true;

	// In the Tauri desktop app, enforce the /hub route (the promo page at / is web-only)
	$: if (isTauri && $page.url.pathname === '/') {
		goto('/hub', { replaceState: true });
	}

	$: hideNavbar =
		['/login', '/register', '/discord', '/privacy', '/terms', '/auth/callback'].includes(
			$page.url.pathname
		) ||
		$page.url.pathname.startsWith('/hub') ||
		$page.status >= 400;

	onMount(async () => {
		const token = localStorage.getItem('authToken');
		if (token && !$user) {
			try {
				await API.assureItems();

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
						status: userData.status || {},
						isAdmin: userData.status?.admin === true
					});
				}
			} catch (error) {
				console.error('Failed to restore user session:', error);
				localStorage.removeItem('authToken');
			}
		}
		authLoading = false;
	});
</script>

{#if !hideNavbar}
	<Navbar {authLoading} />
{/if}

<main class={hideNavbar ? '' : ''}>
	<slot />
</main>

{#if !hideNavbar}
	<Footer />
{/if}

<!-- Global desktop download modal (triggered from Hero/Hub "Download Desktop" buttons) -->
<DownloadDesktopModal />