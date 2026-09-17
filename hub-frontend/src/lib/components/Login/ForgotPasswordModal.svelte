<script>
	import { fly, fade } from 'svelte/transition';
	import API from '$lib/api.js';

	export let showForgot;
	export let forgotStatus;
	export let errorMessage;

	let forgotEmail = '';

	async function submitForgot() {
		if (!forgotEmail) {
			errorMessage = 'Please enter an email address.';
			return;
		}

		try {
			await API.forgotPassword(forgotEmail);
			forgotStatus = 'success';
		} catch (err) {
			console.error(err);
			forgotStatus = 'error';
			errorMessage = err.message || 'Failed to send reset email.';
		}
	}
</script>

{#if showForgot}
	<div class="fp-overlay" in:fade={{ duration: 250 }} out:fade={{ duration: 200 }}>
		<div class="fp-card" in:fly={{ y: 20, duration: 350 }} out:fly={{ y: -10, duration: 200 }}>
			{#if !forgotStatus}
				<!-- Icon -->
				<div class="fp-icon-wrap">
					<svg viewBox="0 0 24 24" fill="none" class="fp-icon-svg" xmlns="http://www.w3.org/2000/svg">
						<circle cx="12" cy="11" r="4" stroke="currentColor" stroke-width="1.5" />
						<path d="M12 15v2m0 3h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
						<path d="M4.22 4.22A10 10 0 1 0 19.78 19.78 10 10 0 0 0 4.22 4.22z" stroke="currentColor" stroke-width="1.5" />
					</svg>
				</div>

				<h3 class="fp-title">Reset Password</h3>
				<p class="fp-subtitle">Enter your email and we'll send you a reset link.</p>

				{#if errorMessage}
					<p class="fp-error">{errorMessage}</p>
				{/if}

				<input
					type="email"
					bind:value={forgotEmail}
					placeholder="your@email.com"
					class="fp-input"
				/>

				<div class="fp-actions">
					<button type="button" class="fp-btn fp-btn--primary" on:click={submitForgot}>
						Send Reset Link
					</button>
					<button type="button" class="fp-btn fp-btn--ghost" on:click={() => (showForgot = false)}>
						Cancel
					</button>
				</div>
			{:else if forgotStatus === 'success'}
				<!-- Success state -->
				<div class="fp-icon-wrap fp-icon-wrap--green">
					<svg viewBox="0 0 24 24" fill="none" class="fp-icon-svg" xmlns="http://www.w3.org/2000/svg">
						<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</div>
				<h3 class="fp-title">Email Sent</h3>
				<p class="fp-subtitle">Check your inbox for the reset link. Don't forget to check your spam folder.</p>
				<button type="button" class="fp-btn fp-btn--primary" on:click={() => (showForgot = false)}>
					Got it
				</button>
			{:else if forgotStatus === 'error'}
				<!-- Error state -->
				<div class="fp-icon-wrap fp-icon-wrap--red">
					<svg viewBox="0 0 24 24" fill="none" class="fp-icon-svg" xmlns="http://www.w3.org/2000/svg">
						<path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</svg>
				</div>
				<h3 class="fp-title">Something Went Wrong</h3>
				<p class="fp-subtitle">{errorMessage}</p>
				<button type="button" class="fp-btn fp-btn--primary" on:click={() => (showForgot = false)}>
					Try Again
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.fp-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
	}

	.fp-card {
		background: rgba(15, 8, 30, 0.97);
		border: 1px solid rgba(168, 85, 247, 0.2);
		border-radius: 24px;
		padding: 2.25rem 2rem 1.75rem;
		width: 90%;
		max-width: 360px;
		text-align: center;
		box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(168, 85, 247, 0.08);
	}

	/* Icon */
	.fp-icon-wrap {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.15));
		border: 1.5px solid rgba(168, 85, 247, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 1.25rem;
		box-shadow: 0 0 20px rgba(168, 85, 247, 0.18);
	}
	.fp-icon-wrap--green {
		background: linear-gradient(135deg, rgba(74, 222, 128, 0.12), rgba(16, 185, 129, 0.12));
		border-color: rgba(74, 222, 128, 0.3);
		box-shadow: 0 0 20px rgba(74, 222, 128, 0.15);
	}
	.fp-icon-wrap--red {
		background: linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.12));
		border-color: rgba(239, 68, 68, 0.3);
		box-shadow: 0 0 20px rgba(239, 68, 68, 0.12);
	}
	.fp-icon-svg {
		width: 24px;
		height: 24px;
		color: #c084fc;
	}
	.fp-icon-wrap--green .fp-icon-svg {
		color: #4ade80;
	}
	.fp-icon-wrap--red .fp-icon-svg {
		color: #f87171;
	}

	.fp-title {
		font-size: 1.15rem;
		font-weight: 800;
		color: #fff;
		margin: 0 0 0.4rem;
		letter-spacing: -0.01em;
	}
	.fp-subtitle {
		font-size: 0.82rem;
		color: rgba(255, 255, 255, 0.5);
		line-height: 1.55;
		margin: 0 0 1.25rem;
	}
	.fp-error {
		font-size: 0.78rem;
		color: #f87171;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.25);
		border-radius: 8px;
		padding: 0.4rem 0.65rem;
		margin: 0 0 0.85rem;
	}

	.fp-input {
		width: 100%;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 10px;
		padding: 0.6rem 0.9rem;
		font-size: 0.875rem;
		color: #fff;
		outline: none;
		margin-bottom: 1rem;
		box-sizing: border-box;
		transition: border-color 0.2s, background 0.2s;
	}
	.fp-input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}
	.fp-input:focus {
		border-color: rgba(168, 85, 247, 0.6);
		background: rgba(255, 255, 255, 0.09);
	}

	.fp-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.fp-btn {
		width: 100%;
		border: none;
		border-radius: 999px;
		padding: 0.65rem 1rem;
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.2s, transform 0.15s;
	}
	.fp-btn:hover {
		opacity: 0.88;
		transform: translateY(-1px);
	}
	.fp-btn:active {
		transform: translateY(0);
	}
	.fp-btn--primary {
		background: linear-gradient(135deg, #a855f7, #ec4899);
		color: #fff;
		box-shadow: 0 4px 16px rgba(168, 85, 247, 0.35);
	}
	.fp-btn--ghost {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.55);
	}
	.fp-btn--ghost:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		opacity: 1;
	}
</style>