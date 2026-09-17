<script>
	import { onMount } from 'svelte';
	import { User, Loader, X, Loader2, Crown, Heart } from 'lucide-svelte';
	import API from '$lib/api.js';
	import { goto } from '$app/navigation';
	import { user, login } from '$lib/stores/user';
	import ProfileInfo from '$lib/components/Hub/Profile/ProfileInfo.svelte';
	import AccountSettings from '$lib/components/Hub/Profile/AccountSettings.svelte';
	import GamingAccounts from '$lib/components/Hub/Profile/GamingAccounts.svelte';
	import ConsoleLinkModal from '$lib/components/Hub/Profile/ConsoleLinkModal.svelte';
	import ConsoleUnlinkModal from '$lib/components/Hub/Profile/ConsoleUnlinkModal.svelte';
	import Utils from '$lib/utils';
	import colors from '$lib/colors';
	import consoles from '$lib/consoles.js';
	import { jmcsItems } from '$lib/stores/jmcs';
	import HubSettings from '$lib/components/Hub/Profile/HubSettings.svelte';
	import SocialConnections from '$lib/components/Hub/Profile/SocialConnections.svelte';
	import DisconnectSocialModal from '$lib/components/Hub/Profile/DisconnectSocialModal.svelte';
	import TwoFactorSettings from '$lib/components/Hub/Profile/TwoFactorSettings.svelte';
	import TwoFactorDisableModal from '$lib/components/Hub/Profile/TwoFactorDisableModal.svelte';
	import { page } from '$app/stores';
	import { popupStore } from '$lib/stores/popup';
	import ProfileHeader from '$lib/components/Hub/Profile/ProfileHeader.svelte';

	let loading = true;
	let userData = null;
	let profiles = [];
	let linkingConsole = '';
	let unlinkingConsole = '';
	let unlinkingSocial = { platform: '', title: '', icon: '' };
	let consoleInput = '';
	let message = '';
	let errorMessage = '';
	let showLinkModal = false;
	let showUnlinkModal = false;
	let showSocialUnlinkModal = false;
	let loadingConsoles = {
		wii: false,
		wiiu: false,
		ps3: false,
		x360: false
	};
	let hideEmail = true;
	let hideBirthdate = true;
	let socialModalMessage = '';
	let socialModalError = '';
	let tfaRef;
	let tfaComponent;

	let showDisable2FAModal = false;
	let disable2FACode = '';
	let isDisabling2FA = false;

	async function onDisableSuccess() {
		showDisable2FAModal = false;
		if (tfaComponent) {
			await tfaComponent.finishDisable();
		}
		// Refresh user data to reflect the change
		await refreshUserData();
		popupStore.add('Two-factor authentication has been disabled.', 'success');
	}

	async function handleDisable2FA() {
		isDisabling2FA = true;
		try {
			await API.disable2FA(disable2FACode);
			await onDisableSuccess();
		} catch (error) {
			popupStore.add(error.message || 'Failed to disable 2FA', 'error');
			showDisable2FAModal = false;
		} finally {
			isDisabling2FA = false;
		}
	}

	$: if ($page.url.searchParams.get('setup2fa') === 'true' && tfaRef) {
		tfaRef.scrollIntoView({ behavior: 'smooth' });
		// Optionally highlight it
	}

	function handleRequestDisconnect(event) {
		const { platform } = event.detail;
		if (platform === 'discord') {
			unlinkingSocial = {
				platform: 'discord',
				title: 'Discord',
				icon: 'cib:discord'
			};
			showSocialUnlinkModal = true;
		} else if (platform === 'patreon') {
			unlinkingSocial = {
				platform: 'patreon',
				title: 'Patreon',
				icon: 'cib:patreon'
			};
			showSocialUnlinkModal = true;
		}
	}

	async function handleSocialDisconnect(event) {
		const { platform } = event.detail;

		loading = true;
		socialModalMessage = '';
		socialModalError = '';

		try {
			if (platform === 'discord') {
				await API.disconnectDiscord();
				socialModalMessage = 'Discord account disconnected successfully!';
			} else if (platform === 'patreon') {
				await API.disconnectPatreon();
				socialModalMessage = 'Patreon account disconnected successfully!';
			}

			// Refresh user data
			await refreshUserData();

			// Close modal after success
			setTimeout(() => {
				showSocialUnlinkModal = false;
				clearSocialModal();
			}, 1500);
		} catch (error) {
			if (platform === 'discord') {
				socialModalError = error.message || 'Failed to disconnect Discord account.';
			} else if (platform === 'patreon') {
				socialModalError = error.message || 'Failed to disconnect Patreon account.';
			}
		} finally {
			loading = false;
		}
	}

	function clearSocialModal() {
		socialModalMessage = '';
		socialModalError = '';
	}

	onMount(async () => {
		await refreshUserData();
	});

	async function refreshUserData() {
		loading = true;
		try {
			// Refresh Patreon status in real-time before fetching user data
			try {
				await API.refreshPatreonStatus();
			} catch (_) {
				// Silently ignore — the /me call will still return the last synced data
			}

			userData = await API.getCurrentUser();
			if (userData) {
				profiles = userData.profiles || [];
				login({
					...$user,
					...userData,
					profiles
				});
			} else {
				errorMessage = 'Failed to load user data';
			}
		} catch (error) {
			if (error.code === 86) {
				// We are allowed to be here but need setup
				errorMessage = '';
				userData = { status: { twoFactorEnabled: false } }; // Placeholder for layout/components
			} else {
				popupStore.add(error.message || 'Failed to load user data', 'error');
			}
		} finally {
			loading = false;
		}
	}

	function openLinkModal(consoleKey) {
		console.log('Opening link modal for:', consoleKey);
		linkingConsole = consoleKey;
		message = '';
		errorMessage = '';
		// Only pre-fill username for consoles that don't use code verification
		if (!consoles[consoleKey]?.requiresCodeVerification) {
			consoleInput = profiles.find((p) => p.platformType === consoleKey)?.nameOnPlatform || '';
		} else {
			consoleInput = '';
		}
		showLinkModal = true;
	}

	function openUnlinkModal(consoleKey) {
		console.log('Opening unlink modal for:', consoleKey);
		unlinkingConsole = consoleKey;
		message = '';
		errorMessage = '';
		showUnlinkModal = true;
	}

	async function handleLinkConsole({ detail }) {
		const { platform } = detail;
		const identifier = detail.macAddress || detail.username;

		console.log('Handling linkConsole event:', { platform, identifier, detail });
		loadingConsoles = { ...loadingConsoles, [platform]: true };
		try {
			const response = await API.linkConsoleAccount(platform, identifier);
			await refreshUserData();
			message = `Your ${consoles[platform].title} profile has been linked!`;
			setTimeout(() => {
				showLinkModal = false;
				message = '';
			}, 2000);
		} catch (error) {
			popupStore.add(error.message || `Failed to link ${consoles[platform].title} account`, 'error');
		} finally {
			loadingConsoles = { ...loadingConsoles, [platform]: false };
		}
	}

	/**
	 * Fired by ConsoleLinkModal after acceptCode() succeeds.
	 * Refreshes user data to reflect the newly linked console.
	 */
	async function handleCodeLinked({ detail }) {
		const platform = detail?.platform || linkingConsole;
		console.log('Handling codeLinked event:', platform);
		try {
			await refreshUserData();
			// The modal already shows its own success message and auto-closes.
		} catch (error) {
			console.error('Error refreshing after code link:', error);
		}
	}

	async function handleUnlinkConsole({ detail: platform }) {
		console.log('Handling unlinkConsole event:', platform);
		loadingConsoles = { ...loadingConsoles, [platform]: true };
		try {
			await API.removeConsoleAccount(platform);
			await refreshUserData();
			message = `Your ${consoles[platform].title} profile has been unlinked!`;
			setTimeout(() => {
				showUnlinkModal = false;
				message = '';
			}, 2000);
		} catch (error) {
			popupStore.add(error.message || `Failed to unlink ${consoles[platform].title} account`, 'error');
		} finally {
			loadingConsoles = { ...loadingConsoles, [platform]: false };
		}
	}

	async function saveProfile({ detail: { username, email, password, birthdate } }) {
		loading = true;
		errorMessage = '';
		try {
			const updatedData = {
				username,
				email,
				dateOfBirth: birthdate
			};
			if (password) updatedData.password = password;

			const response = await API.updateUserProfile(updatedData);
			login({
				...$user,
				username: response.username || $user.username,
				email: response.email || $user.email,
				dateOfBirth: response.dateOfBirth || $user.dateOfBirth,
				profiles
			});
			message = 'Profile updated successfully!';
			setTimeout(() => (message = ''), 3000);
		} catch (error) {
			popupStore.add(error.message || 'Failed to update profile', 'error');
		} finally {
			loading = false;
		}
	}

	function handleCloseModal({ detail }) {
		if (detail.clearMessages) {
			message = '';
			errorMessage = '';
		}
	}
</script>

<svelte:head>
	<title>{Utils.getTitle('Profile', true)}</title>
</svelte:head>

<!-- Background with floating orbs -->
<div class="relative min-h-screen">
	<!-- Animated background orbs -->
	<div
		class="absolute top-24 left-16 w-36 h-36 bg-pink-500/8 rounded-full blur-3xl animate-pulse"
	></div>
	<div
		class="absolute top-72 right-24 w-32 h-32 bg-purple-500/8 rounded-full blur-3xl animate-pulse animation-delay-2000"
	></div>
	<div
		class="absolute bottom-32 left-1/3 w-28 h-28 bg-blue-500/8 rounded-full blur-3xl animate-pulse animation-delay-4000"
	></div>

	<!-- Main content -->
	<div class="relative z-10 p-4 md:p-8 space-y-5 md:space-y-6">
		<!-- Header -->
		<ProfileHeader/>

		{#if loading}
			<div class="text-center py-8 text-gray-400">
				<Loader2 class="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
				<p>Loading profile...</p>
			</div>
		{:else}
			<ProfileInfo {userData} {refreshUserData} />

			<!-- Settings Grid -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<AccountSettings {userData} on:saveProfile={saveProfile} {message} {errorMessage} />

				<GamingAccounts
					{profiles}
					{consoles}
					on:openModal={(e) => openLinkModal(e.detail)}
					on:openUnlinkModal={(e) => openUnlinkModal(e.detail)}
					{loadingConsoles}
				/>
			</div>

			<SocialConnections 
				{userData} 
				{loading}
				on:requestDisconnect={handleRequestDisconnect}
			/>

			<!-- 2FA Section -->
			<div bind:this={tfaRef}>
				<TwoFactorSettings 
					{userData} 
					bind:this={tfaComponent}
					tfaToken={$page.url.searchParams.get('tfaToken')}
					on:requestDisable={(e) => {
						disable2FACode = e.detail.code;
						showDisable2FAModal = true;
					}}
				/>
			</div>

			<!-- Hub Settings (full-width) -->
			<HubSettings {userData} on:saveProfile={saveProfile} {message} {errorMessage} />
		{/if}
	</div>
</div>

<ConsoleLinkModal
	bind:show={showLinkModal}
	bind:linkingConsole
	bind:loadingConsoles
	{consoles}
	{profiles}
	bind:consoleInput
	bind:message
	bind:errorMessage
	on:linkConsole={handleLinkConsole}
	on:codeLinked={handleCodeLinked}
	on:closeModal={handleCloseModal}
/>

<ConsoleUnlinkModal
	bind:show={showUnlinkModal}
	{unlinkingConsole}
	{consoles}
	{message}
	{errorMessage}
	on:unlinkConsole={handleUnlinkConsole}
/>

<DisconnectSocialModal
	bind:show={showSocialUnlinkModal}
	platform={unlinkingSocial.platform}
	platformTitle={unlinkingSocial.title}
	platformIcon={unlinkingSocial.icon}
	message={socialModalMessage}
	errorMessage={socialModalError}
	on:confirm={handleSocialDisconnect}
	on:closeModal={clearSocialModal}
/>

<TwoFactorDisableModal
	show={showDisable2FAModal}
	code={disable2FACode}
	on:close={() => (showDisable2FAModal = false)}
	on:confirm={handleDisable2FA}
	isLoading={isDisabling2FA}
	on:success={onDisableSuccess}
/>

<style>
	/* Animation delays */
	.animation-delay-2000 {
		animation-delay: 2s;
	}
	.animation-delay-4000 {
		animation-delay: 4s;
	}

	/* Custom scrollbar */
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

	/* modal backdrop */
	dialog.modal {
		backdrop-filter: blur(8px);
	}

	dialog.modal::backdrop {
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
	}

	/* Loading animation for save button */
	.loading {
		width: 1rem;
		height: 1rem;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Input focus effects */
	input:focus {
		transform: translateY(-1px);
	}

	/* Button hover effects */
	button:not(:disabled):hover {
		filter: brightness(1.1);
	}

	/* Smooth transitions for specific interactive elements */
	button,
	input,
	.morphing-element {
		transition-property: transform, box-shadow, border-color, background-color, color, filter;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		transition-duration: 300ms;
	}

	/* Hover animations */
	button:not(:disabled):hover {
		transform: translateY(-2px);
	}

	input:focus {
		transform: translateY(-1px);
	}
</style>
