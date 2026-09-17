<script>
	import { fly } from 'svelte/transition';
	import API from '$lib/api.js';
	import { Eye, EyeOff } from 'lucide-svelte';
	import { isLoggedIn, login } from '$lib/stores/user';
	import { goto } from '$app/navigation';
	import { onMount, createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';
	import { isTauri as isTauriRuntime } from '$lib/tauri.js';

	const dispatch = createEventDispatcher();

	export let openForgot;
	export let errorMessage;
	export let twoFactorRequired = false;
	export let isLoading = false;

	let usernameOrEmail = '';
	let password = '';
	let showPassword = false;
	let twoFactorCode = '';

	export function setTwoFactorCode(code) {
		twoFactorCode = code;
		if (twoFactorToken) {
			handleVerify2FA();
		} else {
			handleSubmit();
		}
	}

	let twoFactorToken = '';
	let setupRequired = false;

	onMount(() => {
		if ($isLoggedIn) {
			goto('/hub');
		}
	});

	async function handleVerify2FA() {
		errorMessage = '';
		isLoading = true;

		try {
			const response = await API.verify2FA(twoFactorCode, twoFactorToken);
			await finalizeLogin(response.session);
		} catch (err) {
			errorMessage = err.message ? err.message : 'An unknown error occurred. Please try again later.';
			twoFactorCode = '';
		} finally {
			isLoading = false;
		}
	}

	async function finalizeLogin(session) {
		localStorage.setItem('authToken', session.token);

		const userData = await API.getCurrentUser();
		if (!userData) throw new Error('Failed to fetch user data');

		login({
			userId: userData.userId,
			username: userData.username,
			email: userData.email,
			country: userData.country,
			dateOfBirth: userData.dateOfBirth,
			firstName: userData.firstName,
			lastName: userData.lastName,
			gender: userData.gender,
			preferredLanguage: userData.preferredLanguage,
			accountType: userData.accountType,
			ageGroup: userData.ageGroup,
			dateCreated: userData.dateCreated,
			avatar: API.getAvatarUrl(userData.avatarId || 1),
			notifications: 0,
			status: userData.status || {},
			isAdmin: userData.status.admin === true
		});

		goto('/hub');
	}

	export async function handleSubmit(e) {
		if (e) e.preventDefault();
		if (twoFactorToken) return handleVerify2FA();

		errorMessage = '';
		isLoading = true;

		try {
			const isTauri = isTauriRuntime();

			const response = await API.login({
				email: usernameOrEmail,
				password,
				isTauri
			});

			if (response.twoFactorRequired) {
				twoFactorRequired = true;
				setupRequired = response.setupRequired;
				twoFactorToken = response.twoFactorToken;
				isLoading = false;
				twoFactorCode = '';

				if (setupRequired) {
					dispatch('showSetup', {
						token: twoFactorToken,
						userId: response.userId
					});
					return;
				}
				return;
			}

			await finalizeLogin(response.session);
		} catch (err) {
			console.error(err);
			// Backend errors (invalid credentials, locked account, etc.) carry a code + message
			// Everything else (network failures, fetch/TypeError) is unknown → generic message
			errorMessage = err.message ? err.message : 'An unknown error occurred. Please try again later.';
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Open the Discord OAuth flow.
	 * On the web this opens in a new tab; inside the Tauri webview it
	 * navigates in-place so the login stays inside the app (no shell.open,
	 * no external browser).
	 */
	function handleDiscordLogin() {
		const url = API.getDiscordAuthUrl();
		if (isTauriRuntime()) {
			window.location.href = url;
		} else {
			window.open(url, '_blank', 'noopener,noreferrer');
		}
	}
</script>

<form on:submit={handleSubmit} class="lf-form" in:fly={{ y: 12, duration: 300 }}>
	<!-- Email -->
	<div class="lf-field">
		<label class="lf-label" for="lf-email">Email</label>
		<input
			id="lf-email"
			type="email"
			bind:value={usernameOrEmail}
			placeholder="hello@example.com"
			class="lf-input"
			disabled={isLoading}
			required
		/>
	</div>

	<!-- Password -->
	<div class="lf-field">
		<label class="lf-label" for="lf-password">Password</label>
		<div class="lf-input-wrap">
			<input
				id="lf-password"
				type={showPassword ? 'text' : 'password'}
				bind:value={password}
				placeholder="Your password"
				class="lf-input"
				disabled={isLoading}
				required
			/>
			<button
				type="button"
				class="lf-eye"
				on:click={() => (showPassword = !showPassword)}
				disabled={isLoading}
				aria-label="Toggle password visibility"
			>
				{#if showPassword}
					<EyeOff size={16} />
				{:else}
					<Eye size={16} />
				{/if}
			</button>
		</div>
	</div>

	<!-- Submit -->

	<!-- Forgot password -->
	<div class="lf-row lf-row--right">
		<button type="button" class="lf-forgot" on:click={openForgot} disabled={isLoading}
			>Forgot password?</button
		>
	</div>

	<!-- Submit -->
	<button type="submit" class="lf-submit" disabled={isLoading}>
		{#if isLoading}
			<svg class="lf-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				/>
			</svg>
			Logging In…
		{:else}
			Log In
		{/if}
	</button>

	<!-- Discord Login -->
	<div class="lf-divider">
		<span class="lf-divider-text">OR</span>
	</div>

	<a
		href={API.getDiscordAuthUrl()}
		on:click|preventDefault={handleDiscordLogin}
		class="lf-discord-btn"
		class:lf-disabled={isLoading}
	>
		<Icon icon="cib:discord" width="18" height="18" />
		Login with Discord
	</a>
</form>

<style>
	.lf-form {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		width: 100%;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 1.25rem 1.25rem;
		backdrop-filter: blur(8px);
		margin: auto 0; /* centers vertically within flex parent */
	}

	.lf-field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.lf-label {
		font-size: 0.72rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.55);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.lf-input-wrap {
		position: relative;
	}
	.lf-input {
		width: 100%;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 10px;
		padding: 0.55rem 0.85rem;
		font-size: 0.875rem;
		color: #fff;
		outline: none;
		transition:
			border-color 0.2s,
			background 0.2s;
		box-sizing: border-box;
	}
	.lf-input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}
	.lf-input:focus {
		border-color: rgba(168, 85, 247, 0.65);
		background: rgba(255, 255, 255, 0.09);
	}
	.lf-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.lf-hint {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.4);
		margin-top: 0.2rem;
	}
	/* password field gets right padding for eye button */
	.lf-input-wrap .lf-input {
		padding-right: 2.5rem;
	}
	.lf-eye {
		position: absolute;
		right: 0.65rem;
		top: 50%;
		transform: translateY(-50%);
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.4);
		cursor: pointer;
		display: flex;
		align-items: center;
		padding: 0;
		transition: color 0.2s;
	}
	.lf-eye:hover {
		color: #c084fc;
	}
	.lf-eye:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.lf-row {
		display: flex;
		align-items: center;
	}
	.lf-row--right {
		justify-content: flex-end;
	}
	.lf-forgot {
		font-size: 0.78rem;
		color: #c084fc;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: color 0.2s;
	}
	.lf-forgot:hover {
		color: #a855f7;
	}
	.lf-forgot:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.lf-submit {
		margin-top: 0.25rem;
		width: 100%;
		background: linear-gradient(135deg, #a855f7, #ec4899);
		border: none;
		border-radius: 999px;
		padding: 0.65rem 1rem;
		font-size: 0.9rem;
		font-weight: 700;
		color: #fff;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		transition:
			opacity 0.2s,
			transform 0.15s,
			box-shadow 0.2s;
		box-shadow: 0 4px 20px rgba(168, 85, 247, 0.35);
	}
	.lf-submit:hover:not(:disabled) {
		opacity: 0.9;
		transform: translateY(-1px);
		box-shadow: 0 6px 24px rgba(168, 85, 247, 0.5);
	}
	.lf-submit:active:not(:disabled) {
		transform: translateY(0);
	}
	.lf-submit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.lf-spin {
		width: 16px;
		height: 16px;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.lf-divider {
		display: flex;
		align-items: center;
		margin: 0.5rem 0;
	}
	.lf-divider::before,
	.lf-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: rgba(255, 255, 255, 0.1);
	}
	.lf-divider-text {
		padding: 0 0.75rem;
		font-size: 0.65rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.3);
		letter-spacing: 0.05em;
	}

	.lf-discord-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.65rem;
		background: #5865f2;
		color: #fff;
		text-decoration: none;
		border-radius: 999px;
		padding: 0.65rem 1rem;
		font-size: 0.85rem;
		font-weight: 700;
		transition:
			opacity 0.2s,
			transform 0.15s,
			box-shadow 0.2s;
		box-shadow: 0 4px 15px rgba(88, 101, 242, 0.3);
	}
	.lf-discord-btn:hover:not(.lf-disabled) {
		opacity: 0.9;
		transform: translateY(-1px);
		box-shadow: 0 6px 20px rgba(88, 101, 242, 0.45);
	}
	.lf-discord-btn.lf-disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}
</style>
