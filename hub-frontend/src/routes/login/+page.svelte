<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	import LoginForm from '$lib/components/Login/LoginForm.svelte';
	import RegisterForm from '$lib/components/Login/RegisterForm.svelte';
	import ForgotPasswordModal from '$lib/components/Login/ForgotPasswordModal.svelte';
	import AvatarSelectionModal from '$lib/components/Login/AvatarSelectionModal.svelte';
	import TwoFactorLoginModal from '$lib/components/Login/TwoFactorLoginModal.svelte';
	import TwoFactorSetupModal from '$lib/components/Login/TwoFactorSetupModal.svelte';

	import Utils from '$lib/utils';
	import theme from '$lib/theme';

	let isRegister = false;
	let showForgot = false;
	let forgotStatus = '';
	let errorMessage = '';

	// Registration flow state
	let registrationStep = 'avatar'; // 'avatar' -> 'form'
	let selectedAvatar = 1; // Default avatar

	let twoFactorRequired = false;
	let showSetupModal = false;
	let tfaToken = '';
	let tfaUserId = '';
	let loginComponent;

	onMount(() => {
		const r = $page.url.searchParams.get('r');
		isRegister = r === 'true';
	});

	function toggleMode() {
		isRegister = !isRegister;
		forgotStatus = '';
		errorMessage = '';
		if (isRegister) {
			registrationStep = 'avatar';
			selectedAvatar = 1;
		}
	}

	function openForgot() {
		showForgot = true;
		forgotStatus = '';
		errorMessage = '';
	}

	function handleAvatarNext(event) {
		selectedAvatar = event.detail.avatar;
		registrationStep = 'form';
	}

	function handleBackToAvatar() {
		registrationStep = 'avatar';
		errorMessage = '';
	}

	function handleBackToLogin() {
		isRegister = false;
		registrationStep = 'avatar';
		errorMessage = '';
	}
</script>

<svelte:head>
	<title
		>{isRegister
			? Utils.getTitle('Join the Dance', true)
			: Utils.getTitle('Welcome Back', true)}</title
	>
</svelte:head>

<!-- Full-viewport, no scroll -->
<div class="auth-root">
	<!-- Left panel: fixed height, no overflow -->
	<div class="auth-left" style={`background: ${theme.getDarkerGradient('135deg')}`}>
		<!-- Ambient blobs -->
		<div class="blobs" aria-hidden="true">
			<div class="blob blob-1"></div>
			<div class="blob blob-2"></div>
			<div class="blob blob-3"></div>
		</div>

		<!-- Logo -->
		<div
			class="auth-logo {!isRegister ? 'auth-logo--login' : 'auth-logo--login'}"
			in:fade={{ duration: 500 }}
		>
			<a href="/" class="logo-link">
				<img src="/assets/logos/jdm_logo.png" alt="JDMO Logo" class="logo-img" />
			</a>
		</div>

		<!-- Header text -->
		<div
			class="auth-header {!isRegister ? 'auth-header--login' : ''}"
			in:fade={{ duration: 500, delay: 80 }}
		>
			<h1 class="auth-title">
				{#if isRegister}
					{registrationStep === 'avatar' ? 'Pick Your Avatar' : 'Create Account'}
				{:else}
					Welcome back!
				{/if}
			</h1>
			<p class="auth-subtitle">
				{#if isRegister}
					{registrationStep === 'avatar'
						? 'Choose an avatar that represents you'
						: 'Fill in your details to get started'}
				{:else}
					Sign in to continue your journey.
				{/if}
			</p>
		</div>

		<!-- Error banner -->
		{#if errorMessage}
			<div class="error-banner" in:fly={{ y: -8, duration: 250 }}>
				{errorMessage}
			</div>
		{/if}

		<!-- Content area — fixed height, internal scroll -->
		<div class="auth-content">
			{#if !isRegister}
				<div in:fade={{ duration: 250, delay: 60 }} class="form-wrap">
					<LoginForm
						{openForgot}
						bind:errorMessage
						bind:twoFactorRequired
						bind:this={loginComponent}
						on:showSetup={(e) => {
							tfaToken = e.detail.token;
							tfaUserId = e.detail.userId;
							showSetupModal = true;
						}}
					/>
				</div>
			{:else if registrationStep === 'avatar'}
				<div in:fly={{ x: 30, duration: 320 }} class="form-wrap">
					<AvatarSelectionModal
						{selectedAvatar}
						on:next={handleAvatarNext}
						on:back={handleBackToLogin}
					/>
				</div>
			{:else if registrationStep === 'form'}
				<div in:fly={{ x: 30, duration: 320 }} class="form-wrap">
					<RegisterForm
						bind:errorMessage
						{selectedAvatar}
						on:back={handleBackToAvatar}
						bind:isRegister
						bind:showForgot
					/>
				</div>
			{/if}
		</div>

		<!-- Toggle -->
		<div class="auth-toggle" in:fade={{ duration: 300, delay: 200 }}>
			{#if !isRegister}
				<span class="toggle-text">Don't have an account?</span>
				<button type="button" class="toggle-btn" on:click={toggleMode}>Create Account</button>
			{:else if registrationStep === 'avatar'}
				<span class="toggle-text">Already have an account?</span>
				<button type="button" class="toggle-link" on:click={toggleMode}>Sign in instead</button>
			{/if}
		</div>

		<!-- Footer -->
		<div class="auth-footer" in:fade={{ duration: 300, delay: 300 }}>
			Hub &amp; Harbour developed by <a
				href="https://ryuatelier.org"
				target="_blank"
				class="footer-link">RyuAtelier</a
			>
		</div>
	</div>

	<!-- Right panel: decorative splash -->
	<div class="auth-right">
		<img src="/splash.jpg" alt="Join the Dance" class="splash-img" />
		<!-- Seam blend: left edge fades from theme color into splash -->
		<div class="splash-blend"></div>
	</div>
</div>

<ForgotPasswordModal bind:showForgot bind:forgotStatus bind:errorMessage />

<TwoFactorLoginModal
	bind:show={twoFactorRequired}
	isLoading={loginComponent?.isLoading || false}
	error={errorMessage}
	on:submit={(e) => {
		if (loginComponent) {
			loginComponent.setTwoFactorCode(e.detail.code);
			loginComponent.handleSubmit(new Event('submit'));
		}
	}}
	on:close={() => {
		twoFactorRequired = false;
		errorMessage = '';
		if (loginComponent) loginComponent.setTwoFactorCode('');
	}}
/>

<TwoFactorSetupModal
	bind:show={showSetupModal}
	{tfaToken}
	userId={tfaUserId}
	on:close={() => (showSetupModal = false)}
/>

<style>
	/* ── Root: no scroll, full viewport ── */
	:global(html),
	:global(body) {
		height: 100%;
		overflow: hidden;
	}

	.auth-root {
		display: flex;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
	}

	/* ── Left panel ── */
	.auth-left {
		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100vh;
		overflow: hidden;
		padding: calc(1.25rem + env(safe-area-inset-top, 0px)) 1.5rem
			calc(1rem + env(safe-area-inset-bottom, 0px));
		box-sizing: border-box;
	}

	@media (min-width: 1024px) {
		.auth-left {
			width: 46%;
			min-width: 400px;
			max-width: 560px;
			padding: calc(1.75rem + env(safe-area-inset-top, 0px)) 2.5rem
				calc(1.25rem + env(safe-area-inset-bottom, 0px));
		}
	}

	/* ambient blobs */
	.blobs {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}
	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(72px);
		opacity: 0.18;
	}
	.blob-1 {
		width: 280px;
		height: 280px;
		background: #a855f7;
		top: -60px;
		left: -60px;
	}
	.blob-2 {
		width: 240px;
		height: 240px;
		background: #ec4899;
		bottom: 40px;
		right: -40px;
	}
	.blob-3 {
		width: 200px;
		height: 200px;
		background: #3b82f6;
		bottom: 30%;
		left: 20%;
	}

	/* Logo */
	.auth-logo {
		position: relative;
		z-index: 1;
		flex-shrink: 0;
		display: flex;
		justify-content: center;
		margin-bottom: 0.5rem;
	}
	.logo-link {
		display: inline-flex;
	}
	.logo-img {
		/* base size — register/avatar mode (scaled down via transform) */
		width: 108px;
		transform: scale(0.6);
		transform-origin: center center;
		transition:
			transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1),
			filter 0.4s ease;
		filter: drop-shadow(0 0 0px rgba(168, 85, 247, 0));
	}
	/* Login state: full size with glow */
	.auth-logo--login .logo-img {
		transform: scale(1);
		filter: drop-shadow(0 6px 24px rgba(168, 85, 247, 0.4));
	}
	.logo-img:hover {
		filter: drop-shadow(0 4px 28px rgba(168, 85, 247, 0.6)) !important;
		transform: scale(1.07) !important;
	}

	/* Header */
	.auth-header {
		position: relative;
		z-index: 1;
		flex-shrink: 0;
		text-align: center;
		margin-bottom: 0.5rem;
		/* Register/avatar state: subtle scale-down, same spring as logo */
		transform: scale(0.92);
		transform-origin: center top;
		transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	/* Login state: full size */
	.auth-header--login {
		transform: scale(1);
		margin-bottom: 1.5rem;
	}
	.auth-header--login .auth-title {
		font-size: 2.4rem;
		letter-spacing: -0.03em;
		margin-bottom: 0.4rem;
	}
	.auth-header--login .auth-subtitle {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.5);
	}
	.auth-title {
		font-size: 1.75rem;
		font-weight: 800;
		background: linear-gradient(90deg, #f472b6, #a78bfa);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0 0 0.2rem;
		line-height: 1.2;
	}
	.auth-subtitle {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.55);
		margin: 0;
	}

	/* Error banner */
	.error-banner {
		position: relative;
		z-index: 1;
		flex-shrink: 0;
		background: rgba(239, 68, 68, 0.15);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 10px;
		padding: 0.45rem 0.75rem;
		color: #fca5a5;
		font-size: 0.78rem;
		text-align: center;
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
	}

	/* Content: fills remaining space, child scrolls inside */
	.auth-content {
		position: relative;
		z-index: 1;
		flex: 1 1 0;
		min-height: 0; /* critical — lets flex child shrink */
		display: flex;
		flex-direction: column;
	}
	.form-wrap {
		flex: 1 1 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	/* Toggle */
	.auth-toggle {
		position: relative;
		z-index: 1;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding-top: 0.6rem;
	}
	.toggle-text {
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.45);
	}
	.toggle-btn {
		font-size: 0.78rem;
		font-weight: 600;
		color: #c084fc;
		border: 1.5px solid rgba(192, 132, 252, 0.45);
		border-radius: 999px;
		padding: 0.3rem 0.9rem;
		background: transparent;
		cursor: pointer;
		transition:
			background 0.2s,
			color 0.2s,
			border-color 0.2s;
	}
	.toggle-btn:hover {
		background: rgba(192, 132, 252, 0.15);
		border-color: #c084fc;
	}
	.toggle-link {
		font-size: 0.78rem;
		font-weight: 600;
		color: #c084fc;
		background: transparent;
		border: none;
		cursor: pointer;
		text-decoration: underline;
		padding: 0;
		transition: color 0.2s;
	}
	.toggle-link:hover {
		color: #a855f7;
	}

	/* Footer */
	.auth-footer {
		position: relative;
		z-index: 1;
		flex-shrink: 0;
		text-align: center;
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.3);
		padding-top: 0.4rem;
	}
	.footer-link {
		color: rgba(192, 132, 252, 0.6);
		text-decoration: underline;
		transition: color 0.2s;
	}
	.footer-link:hover {
		color: #c084fc;
	}

	/* ── Right panel ── */
	.auth-right {
		display: none;
	}
	@media (min-width: 1024px) {
		.auth-right {
			display: block;
			position: relative;
			flex: 1;
			overflow: hidden;
			background: #0a0a0f;
			isolation: isolate; /* own stacking context, keeps modals above */
		}
	}
	.splash-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 1;
		transition: transform 10s ease-out;
	}
	.auth-right:hover .splash-img {
		transform: scale(1.04);
	}

	/* Seam blend overlay — left edge of splash fades into left panel's gradient */
	.splash-blend {
		position: absolute;
		inset: 0;
		pointer-events: none;
		/* Multi-stop gradient:
		   0%   = theme's secondary (matches left panel right edge at 135deg)
		   18%  = splash's own native purple (rgb 119,74,237)
		   45%  = near-transparent with a hint of purple
		   60%+ = fully transparent, image shows unobstructed */
		background: linear-gradient(
			to right,
			rgba(68, 68, 212, 0.92) 0%,
			rgba(100, 60, 210, 0.7) 8%,
			rgba(119, 74, 237, 0.45) 20%,
			rgba(119, 93, 233, 0.15) 38%,
			rgba(140, 141, 230, 0.04) 54%,
			transparent 68%
		);
	}
	.splash-text {
		position: absolute;
		bottom: 2.5rem;
		left: 2.5rem;
		right: 2.5rem;
		z-index: 1;
	}
	.splash-title {
		font-size: 3rem;
		font-weight: 900;
		font-style: italic;
		color: #fff;
		letter-spacing: -0.04em;
		line-height: 1.05;
		margin: 0 0 0.75rem;
		text-shadow: 0 2px 24px rgba(0, 0, 0, 0.5);
	}
	.splash-accent {
		background: linear-gradient(90deg, #a855f7, #ec4899);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	.splash-desc {
		color: rgba(255, 255, 255, 0.75);
		font-size: 1rem;
		max-width: 380px;
		line-height: 1.55;
		margin: 0;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.4);
	}
</style>
