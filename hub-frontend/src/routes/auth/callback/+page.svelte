<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { login } from '$lib/stores/user';
	import API from '$lib/api';
	import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-svelte';
	import theme from '$lib/theme';
	import { fade, fly } from 'svelte/transition';
	import Utils from '$lib/utils';

	let message = 'Completing authentication...';
	let isError = false;
	let isSuccess = false;

	onMount(async () => {
		const token = $page.url.searchParams.get('token');
		const success = $page.url.searchParams.get('success');
		const error = $page.url.searchParams.get('error');

		if (token) {
			try {
				localStorage.setItem('authToken', token);
				const userData = await API.getCurrentUser();
				if (userData) {
					login({
						...userData,
						avatar: API.getAvatarUrl(userData.avatarId || 1),
						isAdmin: userData.status?.admin === true
					});
					isSuccess = true;

					// Check if Patreon was just linked
					if (userData.patreon?.linked) {
						message = 'Patreon account connected successfully!';
					} else {
						message = 'Welcome back! Redirecting you now...';
					}
					setTimeout(() => goto('/hub'), 1500);
				} else {
					throw new Error('Failed to fetch user data');
				}
			} catch (e) {
				console.error('Auth callback error:', e);
				isError = true;
				message = 'Failed to sync account data. Please try logging in again.';
				setTimeout(() => goto('/login'), 3000);
			}
		} else if (success === 'linked') {
			isSuccess = true;
			message = 'Discord account connected successfully!';
			setTimeout(() => goto('/hub/profile'), 2000);
		} else if (success === 'patreon_linked') {
			isSuccess = true;
			message = 'Patreon account connected successfully!';
			setTimeout(() => goto('/hub/profile'), 2000);
		} else if (error) {
			isError = true;
			switch (error) {
				case 'no_code':
					message = 'Authentication cancelled or failed (no code).';
					break;
				case 'discord_already_linked':
					message = 'This Discord account is already linked to another Hub user.';
					break;
				case 'patreon_already_linked':
					message = 'This Patreon account is already linked to another Hub user.';
					break;
				case 'discord_not_connected':
					message = 'You need to connect your Discord account first before linking Patreon.';
					break;
				case 'not_on_discord_server':
					message = 'You must be a member of the JDMO Discord server to link Patreon.';
					break;
				case 'patreon_auth_failed':
					message = 'Patreon authentication failed. Please try again.';
					break;
				case 'patreon_not_linked':
					message = 'No Hub account found for this Patreon account.';
					break;
				case 'auth_failed':
					message = 'Discord authentication failed. Please try again.';
					break;
				default:
					message = `Authentication failed: ${error}`;
			}
			setTimeout(() => goto('/hub/profile'), 3000);
		} else {
			goto('/hub');
		}
	});
</script>

<svelte:head>
	<title>{Utils.getTitle("Authenticating", true)}</title>
</svelte:head>

<div class="auth-root" style={`background: ${theme.getDarkerGradient('135deg')}`}>
	<!-- Ambient blobs matching login page -->
	<div class="blobs" aria-hidden="true">
		<div class="blob blob-1"></div>
		<div class="blob blob-2"></div>
		<div class="blob blob-3"></div>
	</div>

	<div class="callback-container" in:fly={{ y: 20, duration: 600 }}>
		<div class="callback-card" class:error={isError} class:success={isSuccess}>
			<div class="status-icon">
				{#if isError}
					<div in:fade><AlertCircle size={48} class="text-red-400" /></div>
				{:else if isSuccess}
					<div in:fade><CheckCircle2 size={48} class="text-green-400" /></div>
				{:else}
					<div class="spinner-wrap">
						<Loader2 size={48} class="spin text-purple-400" />
					</div>
				{/if}
			</div>

			<div class="content">
				<h1>{isError ? 'Authentication Error' : isSuccess ? 'Success!' : 'Authenticating'}</h1>
				<p>{message}</p>
			</div>

			{#if isError}
				<button class="retry-btn" on:click={() => goto('/login')}> Back to Login </button>
			{/if}
		</div>
	</div>
</div>

<style>
	:global(html),
	:global(body) {
		height: 100%;
		overflow: hidden;
	}

	.auth-root {
		position: relative;
		width: 100vw;
		height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		font-family: 'Inter', sans-serif;
	}

	/* Ambient Blobs */
	.blobs {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 0;
	}
	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		opacity: 0.2;
	}
	.blob-1 {
		width: 400px;
		height: 400px;
		background: #a855f7;
		top: -100px;
		left: -100px;
	}
	.blob-2 {
		width: 350px;
		height: 350px;
		background: #ec4899;
		bottom: -50px;
		right: -50px;
	}
	.blob-3 {
		width: 300px;
		height: 300px;
		background: #3b82f6;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.callback-container {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 440px;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		align-items: center;
	}

	.callback-card {
		width: 100%;
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 32px;
		padding: 3.5rem 2.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		text-align: center;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.callback-card.error {
		border-color: rgba(239, 68, 68, 0.3);
		background: rgba(239, 68, 68, 0.02);
	}

	.callback-card.success {
		border-color: rgba(74, 222, 128, 0.3);
		background: rgba(74, 222, 128, 0.02);
	}

	.status-icon {
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.spinner-wrap {
		position: relative;
	}
	.spinner-wrap::after {
		content: '';
		position: absolute;
		inset: -10px;
		border: 2px solid rgba(168, 85, 247, 0.1);
		border-radius: 50%;
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.content h1 {
		font-size: 2rem;
		font-weight: 800;
		color: #fff;
		margin: 0 0 0.75rem;
		letter-spacing: -0.02em;
		background: linear-gradient(to bottom, #fff, rgba(255, 255, 255, 0.7));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.content p {
		color: rgba(255, 255, 255, 0.5);
		font-size: 1rem;
		line-height: 1.6;
		margin: 0;
		max-width: 280px;
	}

	.retry-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #fff;
		padding: 0.75rem 1.5rem;
		border-radius: 999px;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
	}
	.retry-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
		transform: translateY(-1px);
	}

	.footer {
		font-size: 0.75rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.2);
		text-transform: uppercase;
		letter-spacing: 0.15em;
	}
</style>
