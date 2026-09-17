<script>
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import { Check, X, Loader, Link, KeyRound, ShieldCheck, AlertTriangle } from 'lucide-svelte';
	import Icon from '@iconify/svelte';
	import { fade, fly } from 'svelte/transition';
	import API from '$lib/api.js';

	const dispatch = createEventDispatcher();

	export let show;
	export let linkingConsole;
	export let loadingConsoles;
	export let consoles;
	export let consoleInput;
	export let profiles = [];
	export let message = '';
	export let errorMessage = '';

	// ── local state ────────────────────────────────────────────────────────────
	let localMessage = '';
	let localErrorMessage = '';
	let isFading = false;
	let isProcessing = false;
	let isValidInput = true;

	// Code-verification flow state
	// step: 'input' | 'confirm'
	let codeStep = 'input';
	let verifiedSession = null; // { nameOnPlatform, platform }
	let pendingCode = '';
	let isProfileTaken = false; // true when error is BELONGS_TO_SOMEONE_ELSE or PROFILE_IN_USE

	// ── reactive helpers ────────────────────────────────────────────────────────
	$: requiresCode = linkingConsole && consoles[linkingConsole]?.requiresCodeVerification;
	// Profile the user currently has linked for this platform (if any)
	$: existingProfile = profiles.find((p) => p.platformType === linkingConsole) ?? null;

	$: {
		if (linkingConsole && loadingConsoles) {
			const wasProcessing = isProcessing;
			isProcessing = loadingConsoles[linkingConsole];
			if (wasProcessing && !isProcessing) {
				if (message) {
					localMessage = message;
					localErrorMessage = '';
				} else if (errorMessage) {
					localErrorMessage = errorMessage;
					localMessage = '';
				}
			}
		}
	}

	$: if (message && !localMessage) {
		localMessage = message;
		localErrorMessage = '';
	}
	$: if (errorMessage && !localErrorMessage) {
		localErrorMessage = errorMessage;
		localMessage = '';
	}
	$: if (localMessage && !localErrorMessage && show) {
		setTimeout(async () => {
			await close();
		}, 2000);
	}
	$: if (show) {
		if (!message && !errorMessage) {
			localMessage = '';
			localErrorMessage = '';
		}
		isValidInput = true;
	}

	const macAddressPattern = /^([0-9A-Fa-f]{2})(-[0-9A-Fa-f]{2}){5}$/;

	function formatMacAddress(value) {
		const clean = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
		const pairs = [];
		for (let i = 0; i < clean.length; i += 2) {
			pairs.push(i + 1 < clean.length ? clean.substring(i, i + 2) : clean.substring(i, i + 1));
		}
		return pairs.slice(0, 6).join('-');
	}

	function handleInputChange(event) {
		const value = event.target.value;
		localErrorMessage = '';
		if (linkingConsole === 'wii') {
			const formatted = formatMacAddress(value);
			consoleInput = formatted;
			isValidInput = formatted.length === 0 || macAddressPattern.test(formatted);
		} else {
			consoleInput = value;
			isValidInput = true;
		}
	}

	function handleCodeInput(event) {
		let value = event.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
		if (value.length > 8) value = value.slice(0, 8);
		if (value.length > 4) {
			value = `${value.slice(0, 4)}-${value.slice(4)}`;
		}
		pendingCode = value;
		localErrorMessage = '';
	}

	function handleCodeKeyDown(event) {
		// Allow backspace, delete, arrows, tab, escape, enter
		if ([8, 9, 13, 27, 37, 39, 46].includes(event.keyCode)) return;
		// Allow ctrl combinations
		if (event.ctrlKey || event.metaKey) return;
		// Only allow alphanumeric
		if (!/[A-Za-z0-9]/.test(event.key)) {
			event.preventDefault();
		}
	}

	function handleKeyDown(event) {
		if (linkingConsole === 'wii') {
			if (
				[8, 9, 27, 13, 46].includes(event.keyCode) ||
				(event.ctrlKey && [65, 67, 86, 88].includes(event.keyCode))
			)
				return;
			if (!/[0-9A-Fa-f]/.test(event.key)) event.preventDefault();
			if (consoleInput.length >= 17 && ![8, 46].includes(event.keyCode)) event.preventDefault();
		}
	}

	function getPlaceholderText() {
		if (linkingConsole === 'wii') return 'XX-XX-XX-XX-XX-XX';
		return `Enter ${linkingConsole && consoles[linkingConsole] ? consoles[linkingConsole].label : 'username'}`;
	}

	async function close() {
		isFading = true;
		await tick();
		await new Promise((r) => setTimeout(r, 300));
		show = false;
		isFading = false;
		isValidInput = true;
		localMessage = '';
		localErrorMessage = '';
		consoleInput = '';
		// reset code flow
		codeStep = 'input';
		verifiedSession = null;
		pendingCode = '';
		isProfileTaken = false;
		dispatch('closeModal', { clearMessages: true });
	}

	// ── Username-based link ────────────────────────────────────────────────────
	async function link() {
		localMessage = '';
		localErrorMessage = '';
		if (linkingConsole === 'wii' && !macAddressPattern.test(consoleInput)) {
			isValidInput = false;
			localErrorMessage = 'Please enter a valid MAC address';
			return;
		}
		if (!consoleInput.trim()) {
			localErrorMessage = 'Please enter a valid input';
			return;
		}
		isProcessing = true;
		const eventData =
			linkingConsole === 'wii'
				? { platform: linkingConsole, macAddress: consoleInput }
				: { platform: linkingConsole, username: consoleInput };
		dispatch('linkConsole', {
			...eventData,
			onSuccess: (msg) => {
				localMessage = msg || 'Account linked!';
				localErrorMessage = '';
				isProcessing = false;
			},
			onError: (err) => {
				localErrorMessage = err || 'Failed to link account.';
				localMessage = '';
				isProcessing = false;
			}
		});
	}

	// ── Code-verification flow ─────────────────────────────────────────────────
	async function verifyCode() {
		localErrorMessage = '';
		isProfileTaken = false;
		if (!pendingCode.trim()) {
			localErrorMessage = 'Please enter a verification code.';
			return;
		}
		isProcessing = true;
		try {
			const result = await API.verifyCode(pendingCode.trim());
			const session = result.sessionData; // { nameOnPlatform, platform }

			// Guard: make sure the code belongs to the platform the user is trying to link.
			if (session.platform !== linkingConsole) {
				const expected = consoles[linkingConsole]?.title ?? linkingConsole;
				const got = consoles[session.platform]?.title ?? session.platform;
				localErrorMessage = `This code belongs to a ${got} account, but you're trying to link a ${expected} account. Please use the correct code.`;
				return;
			}

			verifiedSession = session;
			codeStep = 'confirm';
		} catch (err) {
			if (err.errorId === 'BELONGS_TO_SOMEONE_ELSE') isProfileTaken = true;
			localErrorMessage =
				err.message || "Verification code couldn't be verified. Are you sure it belongs to you?";
		} finally {
			isProcessing = false;
		}
	}

	async function acceptCode() {
		localErrorMessage = '';
		isProfileTaken = false;
		isProcessing = true;
		try {
			const result = await API.acceptCode(pendingCode.trim());
			// success — inform parent to refresh
			dispatch('codeLinked', { platform: verifiedSession?.platform || linkingConsole });
			localMessage = `Your ${consoles[linkingConsole]?.title || ''} account has been linked!`;
			localErrorMessage = '';
			// auto-close after 2 s (the reactive above handles this)
		} catch (err) {
			if (err.errorId === 'PROFILE_IN_USE') isProfileTaken = true;
			localErrorMessage =
				err.message || "Verification code couldn't be accepted. Please try again later.";
		} finally {
			isProcessing = false;
		}
	}

	function backToCodeInput() {
		codeStep = 'input';
		verifiedSession = null;
		localErrorMessage = '';
		isProfileTaken = false;
	}

	$: canSubmit = requiresCode
		? codeStep === 'input'
			? pendingCode.trim().length > 0
			: true
		: consoleInput && (linkingConsole !== 'wii' || macAddressPattern.test(consoleInput));

	function handleKeyPress(event) {
		if (event.key === 'Escape' && show && !isProcessing) close();
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeyPress);
		return () => document.removeEventListener('keydown', handleKeyPress);
	});
</script>

{#if show}
	<div
		class="clm-backdrop"
		class:clm-fade-out={isFading}
		role="dialog"
		aria-modal="true"
		aria-label="Link console account"
		on:click|self={close}
		transition:fade={{ duration: 250 }}
	>
		<div class="clm-modal">
			<!-- Header -->
			<div class="clm-header">
				{#if linkingConsole && consoles[linkingConsole]}
					<div class="clm-console-icon">
						<Icon icon={consoles[linkingConsole].icon} width="20" height="20" />
					</div>
				{/if}
				<div class="clm-header-text">
					<span class="clm-title">
						Link {linkingConsole && consoles[linkingConsole] ? consoles[linkingConsole].title : ''} Account
					</span>
					<span class="clm-sub">
						{#if requiresCode}
							Connect via verification code from the game
						{:else}
							Connect your console to sync with Hub
						{/if}
					</span>
				</div>
			</div>

			<!-- Body -->
			<div class="clm-body">
				{#if requiresCode}
					<!-- ── Code-verification flow ─────────────────────────────── -->
					{#if codeStep === 'input'}
						<div class="clm-field" in:fly={{ y: 8, duration: 200 }}>
							<div class="clm-code-hint">
								<KeyRound size={13} />
								<span
									>Launch the game, go to your in-game profile, and copy the verification code shown
									there.</span
								>
							</div>
							<label class="clm-label" for="clm-code-input">Verification Code</label>
							<input
								id="clm-code-input"
								type="text"
								class="clm-input clm-input--code"
								class:clm-input--error={localErrorMessage}
								placeholder="XXXX-XXXX"
								maxlength="9"
								value={pendingCode}
								on:input={handleCodeInput}
								on:keydown={handleCodeKeyDown}
								disabled={isProcessing}
								autocomplete="off"
								spellcheck="false"
							/>
						</div>
					{:else if codeStep === 'confirm'}
						<!-- Confirmation card -->
						<div class="clm-confirm-card" in:fly={{ y: 8, duration: 200 }}>
							<div class="clm-confirm-icon">
								<ShieldCheck size={22} />
							</div>
							<div class="clm-confirm-info">
								<span class="clm-confirm-label">Account found</span>
								<span class="clm-confirm-name">{verifiedSession?.nameOnPlatform ?? '—'}</span>
								{#if verifiedSession?.platform}
									<span class="clm-confirm-platform"
										>on {consoles[verifiedSession.platform]?.title ??
											verifiedSession.platform}</span
									>
								{/if}
							</div>
						</div>
						{#if existingProfile}
							<div class="clm-overwrite-warn">
								<AlertTriangle size={13} />
								<span>
									Your currently linked <strong>{consoles[linkingConsole]?.title}</strong> account (<strong
										>{existingProfile.nameOnPlatform}</strong
									>) will be replaced.
								</span>
							</div>
						{/if}
						<p class="clm-confirm-question">
							Does this account belong to you? If you accept, it will be added to your Hub account
							and if you already have the same platform, it will be replaced.
						</p>
					{/if}
				{:else}
					<!-- ── Username-based flow ────────────────────────────────── -->
					<div class="clm-field">
						<label class="clm-label" for="clm-input">
							{linkingConsole && consoles[linkingConsole]
								? consoles[linkingConsole].label
								: 'Username'}
						</label>
						<input
							id="clm-input"
							type="text"
							class="clm-input"
							class:clm-input--error={!isValidInput || localErrorMessage}
							placeholder={getPlaceholderText()}
							value={consoleInput}
							on:input={handleInputChange}
							on:keydown={handleKeyDown}
							disabled={isProcessing}
							autocomplete="off"
							spellcheck="false"
						/>
						{#if linkingConsole === 'wii' && consoleInput && !isValidInput}
							<p class="clm-hint clm-hint--err">
								Format: XX-XX-XX-XX-XX-XX (dashes added automatically)
							</p>
						{:else if linkingConsole === 'wii'}
							<p class="clm-hint">Format: XX-XX-XX-XX-XX-XX</p>
						{/if}
						{#if linkingConsole === 'uplay'}
							<p class="clm-uplay-info">This account will be used across both the official and cracked versions of Uplay.</p>
						{/if}
					</div>
				{/if}

				<!-- Feedback -->
				{#if localMessage}
					<div class="clm-feedback clm-feedback--ok">
						<Check size={13} />
						{localMessage}
					</div>
				{/if}
				{#if localErrorMessage}
					<div class="clm-feedback clm-feedback--err">
						{#if isProfileTaken}
							<AlertTriangle size={13} />
						{:else}
							<X size={13} />
						{/if}
						{localErrorMessage}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="clm-footer">
				{#if requiresCode && codeStep === 'confirm' && !localMessage}
					<!-- Back button when confirming -->
					<button
						type="button"
						class="clm-btn clm-btn--ghost"
						on:click={backToCodeInput}
						disabled={isProcessing}
					>
						Back
					</button>
					<button
						type="button"
						class="clm-btn clm-btn--primary"
						on:click={acceptCode}
						disabled={isProcessing}
					>
						{#if isProcessing}
							<Loader size={14} class="clm-spin" />
							Linking…
						{:else}
							<ShieldCheck size={14} />
							Yes, link this account
						{/if}
					</button>
				{:else}
					<button
						type="button"
						class="clm-btn clm-btn--ghost"
						on:click={close}
						disabled={isProcessing}
					>
						Cancel
					</button>
					<button
						type="button"
						class="clm-btn clm-btn--primary"
						on:click={requiresCode ? verifyCode : link}
						disabled={!canSubmit || isProcessing || !!localMessage}
					>
						{#if isProcessing}
							<Loader size={14} class="clm-spin" />
							{requiresCode ? 'Verifying…' : 'Linking…'}
						{:else if requiresCode}
							<KeyRound size={14} />
							Verify Code
						{:else}
							<Link size={14} />
							Link Account
						{/if}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Backdrop */
	.clm-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		transition: opacity 0.3s ease;
		padding: 1rem;
	}
	.clm-fade-out {
		opacity: 0;
	}

	/* Modal */
	.clm-modal {
		background: rgba(31, 41, 55, 0.92);
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 20px;
		width: 100%;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
	}

	/* Header */
	.clm-header {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 1.1rem 1.4rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
		flex-shrink: 0;
	}
	.clm-console-icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: rgba(168, 85, 247, 0.12);
		border: 1px solid rgba(168, 85, 247, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(192, 132, 252, 0.85);
		flex-shrink: 0;
	}
	.clm-header-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.clm-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.92);
	}
	.clm-sub {
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.38);
	}

	/* Body */
	.clm-body {
		padding: 1.1rem 1.4rem;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	/* Code hint banner */
	.clm-code-hint {
		display: flex;
		align-items: flex-start;
		gap: 0.45rem;
		background: rgba(168, 85, 247, 0.08);
		border: 1px solid rgba(168, 85, 247, 0.18);
		border-radius: 10px;
		padding: 0.55rem 0.75rem;
		font-size: 0.72rem;
		color: rgba(192, 132, 252, 0.8);
		line-height: 1.45;
		margin-bottom: 0.25rem;
	}
	.clm-code-hint :global(svg) {
		flex-shrink: 0;
		margin-top: 1px;
	}

	/* Field */
	.clm-field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.clm-label {
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: rgba(255, 255, 255, 0.4);
	}
	.clm-input {
		width: 100%;
		box-sizing: border-box;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		padding: 0.6rem 0.85rem;
		font-size: 0.875rem;
		color: #fff;
		outline: none;
		transition:
			border-color 0.2s,
			background 0.2s;
		font-family: monospace;
	}
	.clm-input--code {
		letter-spacing: 0.05em;
	}
	.clm-input::placeholder {
		color: rgba(255, 255, 255, 0.25);
	}
	.clm-input:focus {
		border-color: rgba(168, 85, 247, 0.6);
		background: rgba(255, 255, 255, 0.07);
	}
	.clm-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.clm-input--error {
		border-color: rgba(239, 68, 68, 0.55) !important;
	}

	/* Hint */
	.clm-hint {
		font-size: 0.68rem;
		color: rgba(255, 255, 255, 0.3);
		margin: 0;
	}
	.clm-hint--err {
		color: rgba(252, 165, 165, 0.85);
	}

	.clm-uplay-info {
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.38);
		margin: 0;
		line-height: 1.4;
		padding: 0.25rem 0 0;
	}

	/* Confirm card */
	.clm-confirm-card {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		background: rgba(74, 222, 128, 0.07);
		border: 1px solid rgba(74, 222, 128, 0.2);
		border-radius: 14px;
		padding: 0.85rem 1rem;
	}
	.clm-confirm-icon {
		width: 42px;
		height: 42px;
		border-radius: 10px;
		background: rgba(74, 222, 128, 0.12);
		border: 1px solid rgba(74, 222, 128, 0.25);
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(134, 239, 172, 0.9);
		flex-shrink: 0;
	}
	.clm-confirm-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}
	.clm-confirm-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: rgba(134, 239, 172, 0.7);
	}
	.clm-confirm-name {
		font-size: 1rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.92);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.clm-confirm-platform {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.38);
	}
	.clm-confirm-question {
		font-size: 0.79rem;
		color: rgba(255, 255, 255, 0.52);
		line-height: 1.5;
		margin: 0;
	}

	/* Overwrite warning */
	.clm-overwrite-warn {
		display: flex;
		align-items: flex-start;
		gap: 0.45rem;
		background: rgba(251, 191, 36, 0.08);
		border: 1px solid rgba(251, 191, 36, 0.25);
		border-radius: 10px;
		padding: 0.55rem 0.75rem;
		font-size: 0.72rem;
		color: rgba(253, 224, 71, 0.85);
		line-height: 1.45;
	}
	.clm-overwrite-warn :global(svg) {
		flex-shrink: 0;
		margin-top: 1px;
	}
	.clm-overwrite-warn strong {
		color: rgba(253, 224, 71, 1);
		font-weight: 700;
	}

	/* Feedback */
	.clm-feedback {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.76rem;
		padding: 0.45rem 0.7rem;
		border-radius: 8px;
	}
	.clm-feedback--ok {
		background: rgba(74, 222, 128, 0.1);
		border: 1px solid rgba(74, 222, 128, 0.22);
		color: rgba(134, 239, 172, 0.9);
	}
	.clm-feedback--err {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.22);
		color: rgba(252, 165, 165, 0.9);
	}

	/* Footer */
	.clm-footer {
		display: flex;
		gap: 0.6rem;
		padding: 0.85rem 1.2rem 1.1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.07);
	}
	.clm-btn {
		flex: 1;
		padding: 0.6rem 1rem;
		border-radius: 999px;
		font-size: 0.83rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		transition:
			opacity 0.2s,
			transform 0.15s,
			background 0.2s;
		border: none;
	}
	.clm-btn:active:not(:disabled) {
		transform: scale(0.97);
	}
	.clm-btn--ghost {
		background: rgba(255, 255, 255, 0.07);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.6);
	}
	.clm-btn--ghost:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
	}
	.clm-btn--ghost:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.clm-btn--primary {
		background: linear-gradient(135deg, #a855f7, #ec4899);
		color: #fff;
		box-shadow: 0 4px 16px rgba(168, 85, 247, 0.3);
	}
	.clm-btn--primary:hover:not(:disabled) {
		opacity: 0.88;
		transform: translateY(-1px);
		box-shadow: 0 6px 20px rgba(168, 85, 247, 0.45);
	}
	.clm-btn--primary:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	:global(.clm-spin) {
		animation: clm-rotate 0.8s linear infinite;
	}
	@keyframes clm-rotate {
		to {
			transform: rotate(360deg);
		}
	}
</style>
