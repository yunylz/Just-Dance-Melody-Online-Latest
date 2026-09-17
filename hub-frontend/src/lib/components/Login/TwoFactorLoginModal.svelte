<script>
	import { fade, fly } from 'svelte/transition';
	import { Shield, Loader2, X } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let show = false;
	export let isLoading = false;
	export let error = '';
	
	let code = '';

	function handleSubmit() {
		if (code.length === 6) {
			dispatch('submit', { code });
		}
	}

	function close() {
		if (!isLoading) {
			show = false;
			code = '';
			dispatch('close');
		}
	}
</script>

{#if show}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="modal-backdrop" on:click|self={close} in:fade={{ duration: 200 }} out:fade={{ duration: 150 }}>
		<div class="modal-content" in:fly={{ y: 20, duration: 300, delay: 50 }} out:fly={{ y: 10, duration: 200 }}>
			<button class="modal-close" on:click={close} disabled={isLoading}>
				<X size={20} />
			</button>

			<div class="modal-header">
				<div class="icon-box">
					<Shield class="w-8 h-8 text-purple-400" />
				</div>
				<h2 class="modal-title">Two-Factor Auth</h2>
				<p class="modal-desc">Enter the 6-digit code from your app.</p>
			</div>

			<form on:submit|preventDefault={handleSubmit} class="modal-form">
				{#if error}
					<div class="modal-error" in:fade>
						{error}
					</div>
				{/if}

				<div class="input-wrap">
					<input
						type="text"
						bind:value={code}
						placeholder="000000"
						maxlength="6"
						pattern="[0-9]*"
						inputmode="numeric"
						class="tfa-input"
						disabled={isLoading}
						required
						autofocus
					/>
				</div>

				<button type="submit" class="submit-btn" disabled={isLoading || code.length !== 6}>
					{#if isLoading}
						<Loader2 class="w-5 h-5 animate-spin" />
						Verifying…
					{:else}
						Verify & Log In
					{/if}
				</button>
			</form>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(8px);
		z-index: 99999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
	}

	.modal-content {
		width: 100%;
		max-width: 400px;
		background: #1a1a24;
		border: 1px solid rgba(255, 255, 255, 0.1);
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

	.modal-close:hover {
		color: #fff;
	}

	.modal-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.icon-box {
		width: 64px;
		height: 64px;
		background: rgba(168, 85, 247, 0.1);
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 1rem;
	}

	.modal-title {
		font-size: 1.5rem;
		font-weight: 800;
		color: #fff;
		margin-bottom: 0.5rem;
	}

	.modal-desc {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.modal-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.modal-error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 12px;
		padding: 0.75rem;
		color: #fca5a5;
		font-size: 0.85rem;
		text-align: center;
	}

	.input-wrap {
		display: flex;
		justify-content: center;
	}

	.tfa-input {
		width: 100%;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 1rem;
		font-size: 2rem;
		text-align: center;
		color: #fff;
		letter-spacing: 0.5rem;
		font-family: monospace;
		outline: none;
		transition: border-color 0.2s;
	}

	.tfa-input:focus {
		border-color: #a855f7;
		background: rgba(168, 85, 247, 0.05);
	}

	.submit-btn {
		background: linear-gradient(135deg, #a855f7, #ec4899);
		border: none;
		border-radius: 12px;
		padding: 1rem;
		font-size: 1rem;
		font-weight: 700;
		color: #fff;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		transition: transform 0.2s, opacity 0.2s;
	}

	.submit-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		opacity: 0.9;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
