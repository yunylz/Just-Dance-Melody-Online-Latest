<script>
	import { createEventDispatcher, tick } from 'svelte';
	import { X, Loader, Check } from 'lucide-svelte';
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	const dispatch = createEventDispatcher();

	export let show;
	export let unlinkingConsole;
	export let consoles;
	export let message;
	export let errorMessage;

	let isFading = false;
	let isProcessing = false;

	async function close() {
		isFading = true;
		await tick();
		await new Promise(resolve => setTimeout(resolve, 300));
		show = false;
		isFading = false;
	}

	async function unlink() {
		isProcessing = true;
		dispatch('unlinkConsole', unlinkingConsole);
		await new Promise(resolve => setTimeout(resolve, 1500));
		isProcessing = false;
		await close();
	}
</script>

{#if show}
<div
	class="cum-backdrop"
	class:cum-fade-out={isFading}
	role="dialog"
	aria-modal="true"
	aria-label="Unlink console account"
	on:click|self={close}
	transition:fade={{ duration: 250 }}
>
	<div class="cum-modal">
		<!-- Header -->
		<div class="cum-header">
			{#if unlinkingConsole && consoles[unlinkingConsole]}
				<div class="cum-console-icon">
					<Icon icon={consoles[unlinkingConsole].icon} width="20" height="20" />
				</div>
			{/if}
			<div class="cum-header-text">
				<span class="cum-title">
					Unlink {unlinkingConsole && consoles[unlinkingConsole] ? consoles[unlinkingConsole].title : ''} Account
				</span>
				<span class="cum-sub">This action cannot be undone</span>
			</div>
		</div>

		<!-- Body -->
		<div class="cum-body">
			<p class="cum-warning">
				Are you sure you want to unlink your <strong>{unlinkingConsole && consoles[unlinkingConsole] ? consoles[unlinkingConsole].title : ''}</strong> account? You can re-link it later.
			</p>

			<!-- Feedback -->
			{#if message}
				<div class="cum-feedback cum-feedback--ok">
					<Check size={13} /> {message}
				</div>
			{/if}
			{#if errorMessage}
				<div class="cum-feedback cum-feedback--err">
					<X size={13} /> {errorMessage}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="cum-footer">
			<button type="button" class="cum-btn cum-btn--ghost" on:click={close} disabled={isProcessing}>
				Cancel
			</button>
			<button type="button" class="cum-btn cum-btn--danger" on:click={unlink} disabled={isProcessing}>
				{#if isProcessing}
					<Loader size={14} class="cum-spin" />
					Unlinking…
				{:else}
					<X size={14} />
					Unlink Account
				{/if}
			</button>
		</div>
	</div>
</div>
{/if}

<style>
	.cum-backdrop {
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
	.cum-fade-out { opacity: 0; }

	.cum-modal {
		background: rgba(31, 41, 55, 0.92);
		border: 1px solid rgba(239, 68, 68, 0.25);
		border-radius: 20px;
		width: 100%;
		max-width: 380px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
	}

	/* Header */
	.cum-header {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 1.1rem 1.4rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
		flex-shrink: 0;
	}
	.cum-console-icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(252, 165, 165, 0.85);
		flex-shrink: 0;
	}
	.cum-header-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.cum-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.92);
	}
	.cum-sub {
		font-size: 0.72rem;
		color: rgba(252, 165, 165, 0.6);
	}

	/* Body */
	.cum-body {
		padding: 1.1rem 1.4rem;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}
	.cum-warning {
		font-size: 0.82rem;
		color: rgba(255, 255, 255, 0.55);
		line-height: 1.5;
		margin: 0;
	}
	.cum-warning strong { color: rgba(255, 255, 255, 0.8); font-weight: 600; }

	/* Feedback */
	.cum-feedback {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.76rem;
		padding: 0.45rem 0.7rem;
		border-radius: 8px;
	}
	.cum-feedback--ok {
		background: rgba(74, 222, 128, 0.1);
		border: 1px solid rgba(74, 222, 128, 0.22);
		color: rgba(134, 239, 172, 0.9);
	}
	.cum-feedback--err {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.22);
		color: rgba(252, 165, 165, 0.9);
	}

	/* Footer */
	.cum-footer {
		display: flex;
		gap: 0.6rem;
		padding: 0.85rem 1.2rem 1.1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.07);
	}
	.cum-btn {
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
		transition: opacity 0.2s, transform 0.15s, background 0.2s;
		border: none;
	}
	.cum-btn:active:not(:disabled) { transform: scale(0.97); }

	.cum-btn--ghost {
		background: rgba(255, 255, 255, 0.07);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.6);
	}
	.cum-btn--ghost:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
	}
	.cum-btn--ghost:disabled { opacity: 0.4; cursor: not-allowed; }

	.cum-btn--danger {
		background: linear-gradient(135deg, #ef4444, #ec4899);
		color: #fff;
		box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
	}
	.cum-btn--danger:hover:not(:disabled) {
		opacity: 0.88;
		transform: translateY(-1px);
		box-shadow: 0 6px 20px rgba(239, 68, 68, 0.45);
	}
	.cum-btn--danger:disabled { opacity: 0.4; cursor: not-allowed; }

	:global(.cum-spin) { animation: cum-rotate 0.8s linear infinite; }
	@keyframes cum-rotate { to { transform: rotate(360deg); } }
</style>