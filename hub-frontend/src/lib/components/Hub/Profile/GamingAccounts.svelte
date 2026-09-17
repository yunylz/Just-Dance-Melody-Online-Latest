<script>
	import { createEventDispatcher } from 'svelte';
	import { X, Loader, Gamepad2, Link, Eye, EyeOff, Info } from 'lucide-svelte';
	import Icon from '@iconify/svelte';

	const dispatch = createEventDispatcher();

	export let profiles;
	export let consoles;
	export let loadingConsoles;

	let showMacAddress = false;

	function handleOpenModal(key) {
		dispatch('openModal', key);
	}
	function handleOpenUnlinkModal(key) {
		dispatch('openUnlinkModal', key);
	}
	function toggleMacVisibility() {
		showMacAddress = !showMacAddress;
	}

	$: linkedKeys = Object.keys(consoles).filter((k) => profiles.find((p) => p.platformType === k));
	$: unlinkableKeys = Object.keys(consoles).filter(
		(k) =>
			!profiles.find((p) => p.platformType === k) &&
			consoles[k].isAvailable &&
			consoles[k].isConnectable
	);
	$: allLinked = unlinkableKeys.length === 0;
</script>

<div class="ga-card bg-gray-800/50">
	<div class="ga-card-header">
		<span class="ga-card-title">Gaming Accounts</span>
		<span class="ga-card-sub">Manage your connected consoles</span>
	</div>

	<!-- Connected -->
	<div class="ga-section">
		<span class="ga-section-label">Connected</span>
		{#if linkedKeys.length === 0}
			<div class="ga-empty">
				<Gamepad2 size={28} class="ga-empty-icon" />
				<p>No consoles connected yet</p>
			</div>
		{:else}
			<div class="ga-list">
				{#each linkedKeys as key}
					{@const profile = profiles.find((p) => p.platformType === key)}
					<div class="ga-item">
						<div class="ga-item-icon">
							<Icon icon={consoles[key].icon} width="16" height="16" />
						</div>
						<div class="ga-item-info">
							<span class="ga-item-name">
							{consoles[key].title}
							{#if key === 'uplay'}
								<span class="ga-info-wrap">
									<span class="ga-info-icon"><Info size={12} /></span>
									<span class="ga-info-tooltip">This account will be used across both the official and cracked versions of Uplay.</span>
								</span>
							{/if}
						</span>
							<span class="ga-item-id">
								{#if key === 'wii' && profile.macAddress}
									{#if showMacAddress}
										{profile.macAddress}
									{:else}
										••••••••••••
									{/if}
									<button
										class="ga-vis-btn"
										on:click={toggleMacVisibility}
										type="button"
										aria-label="Toggle MAC visibility"
									>
										{#if showMacAddress}<Eye size={12} />{:else}<EyeOff size={12} />{/if}
									</button>
								{:else}
									{profile.nameOnPlatform}
								{/if}
							</span>
						</div>
						<button
							class="ga-unlink-btn"
							on:click={() => handleOpenUnlinkModal(key)}
							disabled={loadingConsoles[key]}
							aria-label="Unlink {consoles[key].title}"
						>
							{#if loadingConsoles[key]}
								<Loader size={13} class="ga-spin" />
							{:else}
								<X size={13} />
							{/if}
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Add -->
	{#if !allLinked}
		<div class="ga-section">
			<span class="ga-section-label">Add Account</span>
			<div class="ga-add-grid">
				{#each unlinkableKeys as key}
					<button
						class="ga-add-btn"
						on:click={() => handleOpenModal(key)}
						disabled={loadingConsoles[key]}
					>
						{#if loadingConsoles[key]}
							<Loader size={14} class="ga-spin" />
							<span>Linking…</span>
						{:else}
							<span class="ga-add-icon"
								><Icon icon={consoles[key].icon} width="15" height="15" /></span
							>
							<span>
								{consoles[key].title}
								{#if key === 'uplay'}
									<span class="ga-info-wrap">
										<span class="ga-info-icon"><Info size={12} /></span>
										<span class="ga-info-tooltip">This account will be used across both the official and cracked versions of Uplay.</span>
									</span>
								{/if}
							</span>
							<Link size={12} class="ga-add-link-icon" />
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.ga-card {
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 18px;
		padding: 1.5rem 1.5rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		backdrop-filter: blur(16px);
		transition: border-color 0.2s;
	}
	.ga-card-header {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
	}
	.ga-card-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.92);
		letter-spacing: -0.01em;
	}
	.ga-card-sub {
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.38);
	}

	.ga-section {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}
	.ga-section-label {
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: rgba(255, 255, 255, 0.35);
	}

	/* Empty state */
	.ga-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
		padding: 1.2rem 0;
		color: rgba(255, 255, 255, 0.25);
		font-size: 0.8rem;
	}
	:global(.ga-empty-icon) {
		opacity: 0.35;
	}

	/* Linked list */
	.ga-list {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}
	.ga-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 10px;
		padding: 0.6rem 0.75rem;
		transition: border-color 0.2s;
	}
	.ga-item:hover {
		border-color: rgba(255, 255, 255, 0.15);
	}
	.ga-item-icon {
		width: 28px;
		height: 28px;
		background: rgba(255, 255, 255, 0.07);
		border-radius: 7px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.7);
		flex-shrink: 0;
	}
	.ga-item-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.ga-item-name {
		font-size: 0.82rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.85);
	}
	.ga-item-id {
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.4);
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.ga-vis-btn {
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		color: rgba(255, 255, 255, 0.35);
		display: flex;
		align-items: center;
		transition: color 0.2s;
	}
	.ga-vis-btn:hover {
		color: #c084fc;
	}
	.ga-unlink-btn {
		width: 26px;
		height: 26px;
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 7px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(239, 68, 68, 0.65);
		cursor: pointer;
		transition:
			background 0.2s,
			color 0.2s,
			border-color 0.2s;
		flex-shrink: 0;
	}
	.ga-unlink-btn:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.16);
		color: rgb(248, 113, 113);
		border-color: rgba(239, 68, 68, 0.4);
	}
	.ga-unlink-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Add grid */
	.ga-add-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.45rem;
	}
	.ga-add-btn {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.55rem 0.75rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		font-size: 0.78rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		transition:
			border-color 0.2s,
			background 0.2s,
			color 0.2s;
		white-space: nowrap;
		overflow: hidden;
	}
	.ga-add-btn:hover:not(:disabled) {
		border-color: rgba(168, 85, 247, 0.4);
		background: rgba(168, 85, 247, 0.07);
		color: #c084fc;
	}
	.ga-add-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.ga-add-icon {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}
	:global(.ga-add-link-icon) {
		margin-left: auto;
		opacity: 0.4;
	}

	/* Info tooltip for uplay */
	.ga-info-wrap {
		position: relative;
		display: inline-flex;
		align-items: center;
		vertical-align: middle;
		margin-left: 3px;
	}
	.ga-info-icon {
		color: rgba(255, 255, 255, 0.35);
		cursor: help;
		transition: color 0.2s;
		flex-shrink: 0;
	}
	.ga-info-wrap:hover .ga-info-icon {
		color: rgba(192, 132, 252, 0.8);
	}
	.ga-info-tooltip {
		display: none;
		position: absolute;
		bottom: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
		background: rgba(17, 24, 39, 0.95);
		color: rgba(255, 255, 255, 0.85);
		font-size: 0.68rem;
		font-weight: 400;
		padding: 0.45rem 0.7rem;
		border-radius: 8px;
		white-space: nowrap;
		pointer-events: none;
		z-index: 50;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		line-height: 1.3;
	}
	/* Show tooltip on hover (desktop) */
	@media (hover: hover) {
		.ga-info-wrap:hover .ga-info-tooltip {
			display: block;
		}
	}
	/* Always show text on mobile (no hover) */
	@media (hover: none) {
		.ga-info-tooltip {
			position: static;
			display: inline;
			transform: none;
			background: none;
			border: none;
			box-shadow: none;
			padding: 0;
			margin-left: 0.25rem;
			font-size: 0.65rem;
			color: rgba(255, 255, 255, 0.4);
			white-space: normal;
		}
	}

	:global(.ga-spin) {
		animation: ga-rotate 0.8s linear infinite;
	}
	@keyframes ga-rotate {
		to {
			transform: rotate(360deg);
		}
	}
</style>
