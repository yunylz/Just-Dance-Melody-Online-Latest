<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { Loader, Link, ExternalLink, Unlink, Heart, Crown, AlertTriangle } from 'lucide-svelte';
	import Icon from '@iconify/svelte';
	import API from '$lib/api';

	const dispatch = createEventDispatcher();

	export let userData;
	export let loading = false;

	let patreonEligibility = null;
	let checkingEligibility = false;
	let eligibilityError = null;

	async function handleConnectDiscord() {
		const token = localStorage.getItem('authToken');
		window.location.href = API.getDiscordAuthUrl(token);
	}

	function requestDisconnectDiscord() {
		dispatch('requestDisconnect', { platform: 'discord' });
	}

	async function handleConnectPatreon() {
		const token = localStorage.getItem('authToken');
		window.location.href = API.getPatreonAuthUrl(token);
	}

	function requestDisconnectPatreon() {
		dispatch('requestDisconnect', { platform: 'patreon' });
	}

	async function checkEligibility() {
		if (checkingEligibility || patreonEligibility !== null) return;
		checkingEligibility = true;
		eligibilityError = null;
		try {
			patreonEligibility = await API.checkPatreonEligibility();
		} catch (error) {
			eligibilityError = error.message || 'Failed to check eligibility';
			patreonEligibility = null;
		} finally {
			checkingEligibility = false;
		}
	}

	$: discord = userData?.discord || null;
	$: patreon = userData?.patreon || null;
	$: discordConnected = !!(discord && (discord.connected || discord.id));
	$: if (discordConnected && patreon && !patreon.linked && patreonEligibility === null && !checkingEligibility) {
		checkEligibility();
	}
</script>

<div class="sc-card bg-gray-800/50">
	<div class="sc-card-header">
		<span class="sc-card-title">Social Connections</span>
		<span class="sc-card-sub">Link your social profiles for better integration</span>
	</div>

	<div class="sc-list">
		<!-- Discord -->
		<div class="sc-item" class:sc-item--connected={discordConnected}>
			<div class="sc-item-icon discord">
				<Icon class="pt-0.5" icon="cib:discord" width="20" height="20" />
			</div>
			<div class="sc-item-info">
				<span class="sc-item-name">Discord</span>
				<span class="sc-item-status">
					{#if discordConnected}
						Connected as <strong>{discord.username}</strong>
					{:else}
						Not connected
					{/if}
				</span>
			</div>

			{#if discordConnected}
				<button
					class="sc-btn sc-btn--unlink"
					on:click={requestDisconnectDiscord}
					disabled={loading}
					title="Unlink Discord"
				>
					{#if loading}
						<Loader size={14} class="sc-spin" />
					{:else}
						<Unlink size={14} />
						<span>Unlink</span>
					{/if}
				</button>
			{:else}
				<button class="sc-btn sc-btn--connect" on:click={handleConnectDiscord} disabled={loading}>
					{#if loading}
						<Loader size={14} class="sc-spin" />
					{:else}
						<Link size={14} />
						<span>Connect</span>
					{/if}
				</button>
			{/if}
		</div>

		<!-- Patreon -->
		<div
			class="sc-item"
			class:sc-item--connected={patreon?.linked}
			class:sc-item--disabled={!discordConnected}
		>
			<div class="sc-item-icon patreon">
				<Icon icon="selfhst:patreon-light" width="20" height="20" />
			</div>
			<div class="sc-item-info">
				<span class="sc-item-name">
					Patreon
					{#if patreon?.isSubscribed}
						<span class="patron-badge" title="Active Patron">
							<Crown size={12} />
						</span>
					{/if}
				</span>
				<span class="sc-item-status">
					{#if !discordConnected}
						Connect Discord first
					{:else if patreon?.linked}
						Linked
						{#if patreon?.isSubscribed}
							<span class="status-subscribed">— Active patron</span>
						{:else}
							<span class="status-lapsed">— Subscription inactive</span>
						{/if}
					{:else if checkingEligibility}
						Checking eligibility...
					{:else if eligibilityError}
						Could not verify eligibility
					{:else if patreonEligibility?.eligible}
						Eligible to connect
					{:else if patreonEligibility && !patreonEligibility.inDiscordServer}
						Join the JDMO Discord server first
					{:else}
						Not connected
					{/if}
				</span>
			</div>

			{#if !discordConnected}
				<button class="sc-btn sc-btn--disabled" disabled title="Connect Discord first">
					<Link size={14} />
					<span>Connect</span>
				</button>
			{:else if patreon?.linked}
				<button
					class="sc-btn sc-btn--unlink"
					on:click={requestDisconnectPatreon}
					disabled={loading}
					title="Unlink Patreon"
				>
					{#if loading}
						<Loader size={14} class="sc-spin" />
					{:else}
						<Unlink size={14} />
						<span>Unlink</span>
					{/if}
				</button>
			{:else if checkingEligibility}
				<button class="sc-btn sc-btn--disabled" disabled title="Checking eligibility…">
					<Loader size={14} class="sc-spin" />
					<span>Checking</span>
				</button>
			{:else if eligibilityError}
				<button class="sc-btn sc-btn--connect" on:click={checkEligibility} disabled={loading}>
					<Icon icon="lucide:refresh-cw" width="14" height="14" />
					<span>Retry</span>
				</button>
			{:else if !patreonEligibility?.eligible && !patreonEligibility?.inDiscordServer}
				<a
					class="sc-btn sc-btn--connect"
					href="https://discord.gg/jdmo"
					target="_blank"
					rel="noopener noreferrer"
				>
					<ExternalLink size={14} />
					<span>Join Server</span>
				</a>
			{:else if patreonEligibility?.eligible}
				<button class="sc-btn sc-btn--connect" on:click={handleConnectPatreon} disabled={loading}>
					{#if loading}
						<Loader size={14} class="sc-spin" />
					{:else}
						<Link size={14} />
						<span>Connect</span>
					{/if}
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.sc-card {
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 18px;
		padding: 1.5rem 1.5rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		backdrop-filter: blur(16px);
	}

	.sc-card-header {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
	}

	.sc-card-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.92);
		letter-spacing: -0.01em;
	}

	.sc-card-sub {
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.38);
	}

	.sc-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.sc-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		padding: 0.85rem 1rem;
		transition: all 0.2s ease;
	}

	.sc-item:hover {
		border-color: rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.05);
	}

	.sc-item--connected {
		border-color: rgba(139, 92, 246, 0.3);
		background: rgba(139, 92, 246, 0.05);
	}

	.sc-item-icon {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		flex-shrink: 0;
		line-height: 0; /* Fix for iconify centering */
	}

	.sc-item-icon.discord {
		background: #5865f2;
		box-shadow: 0 4px 12px rgba(88, 101, 242, 0.3);
	}

	.sc-item-icon.patreon {
		background: #000000;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.sc-item--disabled {
		opacity: 0.45;
		pointer-events: none;
	}

	.sc-item--disabled:hover {
		border-color: rgba(255, 255, 255, 0.08) !important;
		background: rgba(255, 255, 255, 0.03) !important;
	}

	.sc-btn--disabled {
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.3);
		cursor: not-allowed;
		border: none;
	}

	.patron-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: #000000;
		color: #fff;
		border-radius: 50%;
		width: 18px;
		height: 18px;
		margin-left: 4px;
		vertical-align: middle;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
	}

	.status-subscribed {
		color: rgba(74, 222, 128, 0.8);
	}

	.status-lapsed {
		color: rgba(251, 191, 36, 0.7);
	}

	.sc-item-icon :global(svg) {
		display: block;
		margin: auto;
	}

	.sc-item-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.sc-item-name {
		font-size: 0.9rem;
		font-weight: 700;
		color: #fff;
	}

	.sc-item-status {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.45);
	}

	.sc-item-status strong {
		color: rgba(255, 255, 255, 0.8);
	}

	.sc-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.9rem;
		border-radius: 8px;
		font-size: 0.78rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.sc-btn--connect {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	.sc-btn--connect:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
		transform: translateY(-1px);
	}

	.sc-btn--unlink {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	.sc-btn--unlink:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.2);
		color: #f87171;
	}

	.sc-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.sc-spin {
		animation: sc-rotate 0.8s linear infinite;
	}

	@keyframes sc-rotate {
		to {
			transform: rotate(360deg);
		}
	}
</style>
