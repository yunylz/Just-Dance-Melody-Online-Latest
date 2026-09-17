<script>
	import { Loader2 } from 'lucide-svelte';
	import API from '$lib/api.js';
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';

	export let userData;
	export let refreshUserData;

	const dispatch = createEventDispatcher();

	let isFading = false;
	let isProcessing = false;
	let avatars = [];
	let selectedAvatar = null;
	let errorMessage = '';

	$: if (userData && userData.avatarId !== undefined) {
		selectedAvatar = Number(userData.avatarId);
	}

	async function fetchAvatars() {
		try {
			// Enforce a minimum visible loading time so the spinner isn't just a flash
			const [response] = await Promise.all([
				API.getItems(),
				new Promise(r => setTimeout(r, 600))
			]);
			avatars = response.avatars;
		} catch (error) {
			errorMessage = 'Failed to load avatars';
		}
	}

	async function saveAvatar() {
		if (!selectedAvatar) return;
		isProcessing = true;
		errorMessage = '';
		try {
			await API.updateUserProfile({ avatarId: Number(selectedAvatar) });
			const avatarObj = avatars.find((a) => Number(a.id) === selectedAvatar);
			isFading = true;
			await refreshUserData();
			setTimeout(() => {
				dispatch('select', { id: selectedAvatar, url: avatarObj?.url });
				dispatch('close');
				isProcessing = false;
				isFading = false;
			}, 300);
		} catch (error) {
			errorMessage = 'Failed to save avatar';
			isProcessing = false;
		}
	}

	function close() {
		isFading = true;
		setTimeout(() => {
			isFading = false;
			dispatch('close');
		}, 300);
	}

	// Derive preview URL from the ID directly — no need to wait for avatars array
	$: previewUrl = selectedAvatar ? API.getAvatarUrl(selectedAvatar) : null;

	fetchAvatars();
</script>

<!-- Backdrop -->
<div
	class="am-backdrop"
	class:am-fade-out={isFading}
	role="dialog"
	aria-modal="true"
	aria-label="Select Avatar"
	on:click|self={close}
	transition:fade={{ duration: 280 }}
>
	<div class="am-modal">
		<!-- Header strip with preview -->
		<div class="am-header">
			<div class="am-preview">
				{#if previewUrl}
					<img src={previewUrl} alt="Selected avatar" class="am-preview-img" />
				{:else}
					<div class="am-preview-placeholder">?</div>
				{/if}
			</div>
			<div class="am-header-text">
				<span class="am-title">Change Avatar</span>
				<span class="am-sub">Choose from your collection</span>
			</div>
		</div>

		<!-- Error -->
		{#if errorMessage}
			<div class="am-error">{errorMessage}</div>
		{/if}

		<!-- Scrollable grid -->
		<div class="am-grid-area">
			{#if avatars.length === 0}
				<div class="am-loading">
					<Loader2 class="am-spinner" />
					<span>Loading avatars…</span>
				</div>
			{:else}
				<div class="am-grid">
					{#each avatars as avatar}
						<button
							type="button"
							class="am-item"
							class:am-item--selected={selectedAvatar === Number(avatar.id)}
							on:click={() => (selectedAvatar = Number(avatar.id))}
						>
							<img src={avatar.url} alt="Avatar {avatar.id}" class="am-img" />
							{#if selectedAvatar === Number(avatar.id)}
								<div class="am-check">✓</div>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Actions -->
		<div class="am-actions">
			<button type="button" class="am-btn am-btn--ghost" on:click={close} disabled={isProcessing}>
				Cancel
			</button>
			<button
				type="button"
				class="am-btn am-btn--primary"
				on:click={saveAvatar}
				disabled={!selectedAvatar || isProcessing}
			>
				{#if isProcessing}
					<Loader2 class="am-spin-icon" size={14} />
					Saving…
				{:else}
					Save Avatar
				{/if}
			</button>
		</div>
	</div>
</div>

<style>
	/* Backdrop */
	.am-backdrop {
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
	.am-fade-out { opacity: 0; }

	/* Modal panel */
	.am-modal {
		background: rgba(31, 41, 55, 0.92);
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 20px;
		width: 100%;
		max-width: 600px;
		height: 80vh;
		max-height: 680px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
	}

	/* Header */
	.am-header {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 1.1rem 1.4rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
		flex-shrink: 0;
	}
	.am-preview {
		width: 44px;
		height: 44px;
		border-radius: 10px;
		overflow: hidden;
		border: 2px solid rgba(168, 85, 247, 0.4);
		flex-shrink: 0;
	}
	.am-preview-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.am-preview-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(168, 85, 247, 0.15);
		color: rgba(255, 255, 255, 0.3);
		font-size: 1.2rem;
	}
	.am-header-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.am-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.92);
	}
	.am-sub {
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.38);
	}

	/* Error */
	.am-error {
		flex-shrink: 0;
		background: rgba(239, 68, 68, 0.12);
		border-bottom: 1px solid rgba(239, 68, 68, 0.25);
		padding: 0.45rem 1.4rem;
		font-size: 0.76rem;
		color: #fca5a5;
		text-align: center;
	}

	/* Grid area */
	.am-grid-area {
		flex: 1 1 0;
		min-height: 240px;
		overflow-y: auto;
		padding: 1rem 1.2rem;
		scrollbar-width: thin;
		scrollbar-color: rgba(139, 92, 246, 0.4) transparent;
	}
	.am-grid-area::-webkit-scrollbar { width: 4px; }
	.am-grid-area::-webkit-scrollbar-thumb {
		background: rgba(139, 92, 246, 0.4);
		border-radius: 4px;
	}

	.am-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.5rem;
	}

	/* Avatar item */
	.am-item {
		position: relative;
		aspect-ratio: 1;
		border-radius: 10px;
		border: 2px solid rgba(255, 255, 255, 0.08);
		overflow: hidden;
		cursor: pointer;
		background: rgba(255, 255, 255, 0.03);
		padding: 0;
		transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
	}
	.am-item:hover {
		border-color: rgba(168, 85, 247, 0.5);
		transform: scale(1.04);
	}
	.am-item--selected {
		border-color: #a855f7;
		box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.25);
	}
	.am-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.am-check {
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
	.am-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		height: 100%;
		min-height: 200px;
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.8rem;
	}
	:global(.am-spinner) {
		width: 28px;
		height: 28px;
		color: #a855f7;
		animation: am-spin 0.8s linear infinite;
	}

	/* Actions */
	.am-actions {
		flex-shrink: 0;
		display: flex;
		gap: 0.6rem;
		padding: 0.85rem 1.2rem 1.1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.07);
	}
	.am-btn {
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
	.am-btn:active:not(:disabled) { transform: scale(0.97); }
	.am-btn--ghost {
		background: rgba(255, 255, 255, 0.07);
		color: rgba(255, 255, 255, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	.am-btn--ghost:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
	}
	.am-btn--primary {
		background: linear-gradient(135deg, #a855f7, #ec4899);
		color: #fff;
		box-shadow: 0 4px 16px rgba(168, 85, 247, 0.3);
	}
	.am-btn--primary:hover:not(:disabled) {
		opacity: 0.88;
		transform: translateY(-1px);
		box-shadow: 0 6px 20px rgba(168, 85, 247, 0.45);
	}
	.am-btn--primary:disabled { opacity: 0.4; cursor: not-allowed; }

	:global(.am-spin-icon) { animation: am-spin 0.8s linear infinite; }
	@keyframes am-spin { to { transform: rotate(360deg); } }
</style>