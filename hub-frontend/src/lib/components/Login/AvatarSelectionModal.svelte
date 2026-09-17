<script>
	import API from '$lib/api';
	import { jmcsItems } from '$lib/stores/jmcs';
	import { Loader2 } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';

	export let selectedAvatar = 1;

	const dispatch = createEventDispatcher();

	let avatars = [];
	let errorMessage = '';

	async function fetchAvatars() {
		try {
			const items = await API.getItems();
			avatars = items.avatars;
			jmcsItems.set(items);
		} catch (error) {
			console.error('Failed to load avatars:', error);
			errorMessage = 'Failed to load avatars';
		}
	}

	function handleNext() {
		if (selectedAvatar) {
			dispatch('next', { avatar: selectedAvatar });
		}
	}

	function handleBack() {
		dispatch('back');
	}

	fetchAvatars();
</script>

<div class="av-wrap">
	<!-- Error -->
	{#if errorMessage}
		<div class="av-error">{errorMessage}</div>
	{/if}

	<!-- Grid -->
	<div class="av-grid-area">
		{#if avatars.length === 0}
			<div class="av-loading">
				<Loader2 class="av-spinner" />
				<span>Loading avatars…</span>
			</div>
		{:else}
			<div class="av-grid">
				{#each avatars as avatar}
					<button
						type="button"
						class="av-item {selectedAvatar === Number(avatar.id) ? 'av-item--selected' : ''}"
						on:click={() => (selectedAvatar = Number(avatar.id))}
					>
						<img src={avatar.url} alt={`Avatar ${avatar.id}`} class="av-img" />
						{#if selectedAvatar === Number(avatar.id)}
							<div class="av-check">✓</div>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Actions -->
	<div class="av-actions">
		<button type="button" class="av-btn av-btn--ghost" on:click={handleBack}>← Back</button>
		<button type="button" class="av-btn av-btn--primary" on:click={handleNext} disabled={!selectedAvatar}>
			Next →
		</button>
	</div>
</div>

<style>
	.av-wrap {
		flex: 1 1 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 1rem 1rem 0.85rem;
		backdrop-filter: blur(8px);
		overflow: hidden;
	}

	.av-error {
		background: rgba(239, 68, 68, 0.15);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 8px;
		padding: 0.4rem 0.75rem;
		font-size: 0.78rem;
		color: #fca5a5;
		text-align: center;
		flex-shrink: 0;
	}

	/* Scrollable area */
	.av-grid-area {
		flex: 1 1 0;
		min-height: 0;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(139, 92, 246, 0.4) transparent;
	}
	.av-grid-area::-webkit-scrollbar {
		width: 5px;
	}
	.av-grid-area::-webkit-scrollbar-thumb {
		background: rgba(139, 92, 246, 0.4);
		border-radius: 4px;
	}

	.av-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.45rem;
		padding-right: 0.2rem;
	}

	.av-item {
		position: relative;
		aspect-ratio: 1;
		border-radius: 10px;
		border: 2px solid rgba(255, 255, 255, 0.08);
		overflow: hidden;
		cursor: pointer;
		background: transparent;
		padding: 0;
		transition:
			border-color 0.2s,
			transform 0.15s;
	}
	.av-item:hover {
		border-color: rgba(168, 85, 247, 0.5);
		transform: scale(1.04);
	}
	.av-item--selected {
		border-color: #a855f7;
		box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.3);
	}

	.av-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.av-check {
		position: absolute;
		top: 3px;
		right: 3px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #a855f7;
		color: #fff;
		font-size: 9px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	/* Loading */
	.av-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 0.5rem;
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.8rem;
	}
	:global(.av-spinner) {
		width: 28px;
		height: 28px;
		color: #a855f7;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Action row */
	.av-actions {
		flex-shrink: 0;
		display: flex;
		gap: 0.6rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.07);
	}
	.av-btn {
		flex: 1;
		padding: 0.55rem 0.75rem;
		border-radius: 999px;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.2s,
			transform 0.15s,
			opacity 0.2s;
		border: none;
	}
	.av-btn:active:not(:disabled) {
		transform: scale(0.97);
	}
	.av-btn--ghost {
		background: rgba(255, 255, 255, 0.07);
		color: rgba(255, 255, 255, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	.av-btn--ghost:hover {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
	}
	.av-btn--primary {
		background: linear-gradient(135deg, #a855f7, #ec4899);
		color: #fff;
		box-shadow: 0 4px 14px rgba(168, 85, 247, 0.3);
	}
	.av-btn--primary:hover:not(:disabled) {
		opacity: 0.88;
	}
	.av-btn--primary:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>