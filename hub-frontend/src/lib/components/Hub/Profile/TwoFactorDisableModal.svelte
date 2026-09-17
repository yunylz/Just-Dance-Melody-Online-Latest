<script>
	import { fade, fly } from 'svelte/transition';
	import { ShieldAlert, X, Loader2 } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let show = false;
	export let isLoading = false;
	export let code = '';

	function handleConfirm() {
		dispatch('confirm');
	}

	function close() {
		if (!isLoading) {
			show = false;
			dispatch('close');
		}
	}
</script>

{#if show}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="modal-backdrop"
		on:click|self={close}
		in:fade={{ duration: 200 }}
		out:fade={{ duration: 150 }}
	>
		<div
			class="modal-content"
			in:fly={{ y: 20, duration: 300, delay: 50 }}
			out:fly={{ y: 10, duration: 200 }}
		>
			<button class="modal-close" on:click={close} disabled={isLoading}>
				<X size={20} />
			</button>

			<div class="modal-header">
				<div class="icon-box">
					<ShieldAlert class="w-8 h-8 text-red-400" />
				</div>
				<h2 class="modal-title text-red-400">Disable 2FA?</h2>
				<p class="modal-desc">
					Your account will be less secure. This action requires your current code to proceed.
				</p>
			</div>

			<div class="modal-body">
				<div class="code-preview">
					<span class="label">Current Code:</span>
					<span class="code">{code}</span>
				</div>
			</div>

			<div class="modal-footer">
				<button class="cancel-btn" on:click={close} disabled={isLoading}> Cancel </button>
				<button class="confirm-btn" on:click={handleConfirm} disabled={isLoading}>
					{#if isLoading}
						<Loader2 class="w-4 h-4 animate-spin" />
					{/if}
					Disable
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(8px);
		z-index: 99999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		transition: opacity 0.3s ease;
	}

	.modal-content {
		width: 100%;
		max-width: 440px;
		background: #1a1a24;
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 24px;
		padding: 2.5rem;
		position: relative;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
	}

	.modal-close {
		position: absolute;
		top: 1.25rem;
		right: 1.25rem;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.4);
		cursor: pointer;
		transition: color 0.2s;
	}

	.modal-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.icon-box {
		width: 64px;
		height: 64px;
		background: rgba(239, 68, 68, 0.1);
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 1rem;
	}

	.modal-title {
		font-size: 1.5rem;
		font-weight: 800;
		margin-bottom: 0.5rem;
	}

	.modal-desc {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.5);
		line-height: 1.5;
	}

	.modal-body {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 16px;
		padding: 1.25rem;
		margin-bottom: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.code-preview {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.label {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.4);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.code {
		font-family: monospace;
		font-size: 1.25rem;
		color: #fff;
		letter-spacing: 0.2rem;
	}

	.modal-footer {
		display: grid;
		grid-template-columns: 1fr 1.5fr;
		gap: 1rem;
	}

	.cancel-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #fff;
		padding: 0.85rem;
		border-radius: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.cancel-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
	}

	.confirm-btn {
		background: #ef4444;
		border: none;
		color: #fff;
		padding: 0.85rem;
		border-radius: 12px;
		font-weight: 700;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		transition: all 0.2s;
		box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
	}

	.confirm-btn:hover:not(:disabled) {
		background: #dc2626;
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
	}

	.confirm-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
