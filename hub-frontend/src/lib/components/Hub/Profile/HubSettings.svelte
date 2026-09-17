<script>
	import { createEventDispatcher } from 'svelte';
	import { Loader, Check, X, Bell, BellOff } from 'lucide-svelte';
	import API from '$lib/api';
	import { user } from '$lib/stores/user';
	import Utils from '$lib/utils';
	import { subscribePush, unsubscribePush } from '$lib/push';

	const dispatch = createEventDispatcher();

	export let userData;
	export let saving;
	export let message;
	export let errorMessage;

	// Hub settings state — initialize from userData if the field exists
	let shareAccount = userData?.hubSettings?.shareAccount ?? true;
	let darkMode = userData?.hubSettings?.theme !== 'light';
	let pushEnabled = userData?.hubSettings?.pushNotifications ?? false;
	let pushMobile = Utils.isMobile();
	let isSaving = false;
	let toastMsg = '';
	let toastOk = true;
	let toastTimer;
	let pushLoading = false;

	function showToast(msg, ok = true) {
		clearTimeout(toastTimer);
		toastMsg = msg;
		toastOk = ok;
		toastTimer = setTimeout(() => { toastMsg = ''; }, 2000);
	}

	async function saveField(field, value) {
		const newShare = field === 'shareAccount' ? value : shareAccount;
		const newTheme = field === 'theme' ? value : (darkMode ? 'dark' : 'light');
		isSaving = true;
		try {
			await API.updateUserProfile({ hubSettings: { shareAccount: newShare, theme: newTheme } });
			user.update(u => u ? { ...u, hubSettings: { ...u.hubSettings, shareAccount: newShare, theme: newTheme } } : u);
			showToast('Saved!');
		} catch (err) {
			showToast(err.message || 'Failed to save', false);
		} finally {
			isSaving = false;
		}
	}

	function toggleShare() {
		const next = !shareAccount;
		shareAccount = next;
		saveField('shareAccount', next);
	}

	function toggleTheme() {
		const next = !darkMode;
		darkMode = next;
		saveField('theme', next ? 'dark' : 'light');
	}

	async function togglePush() {
		if (pushLoading) return;
		const next = !pushEnabled;
		pushLoading = true;

		try {
			if (next) {
				await subscribePush();
			} else {
				await unsubscribePush();
			}

			await API.updateUserProfile({ hubSettings: { pushNotifications: next } });
			user.update(u => u ? { ...u, hubSettings: { ...u.hubSettings, pushNotifications: next } } : u);
			pushEnabled = next;
			showToast(next ? 'Push notifications enabled' : 'Push notifications disabled');
		} catch (err) {
			showToast(err.message || 'Failed to save', false);
		} finally {
			pushLoading = false;
		}
	}
</script>

<div class="hs-card bg-gray-800/50">
	<div class="hs-card-header">
		<span class="hs-card-title">Hub Settings</span>
		<span class="hs-card-sub">Manage your experience on Hub</span>
	</div>

	<div class="hs-body">
		<!-- Share profile toggle -->
		<div class="hs-row">
			<div class="hs-row-info">
				<span class="hs-row-label">Share my account</span>
				<span class="hs-row-desc">Let other players find you on various places in Hub</span>
			</div>
			<button
				class="hs-toggle"
				class:hs-toggle--on={shareAccount}
				type="button"
				role="switch"
				aria-checked={shareAccount}
				on:click={toggleShare}
			>
				<span class="hs-toggle-thumb" />
			</button>
		</div>

		<!-- Dark mode toggle -->
		<div class="hs-row">
			<div class="hs-row-info">
				<span class="hs-row-label">
					Dark Mode
					<span class="hs-badge">Experimental</span>
				</span>
				<span class="hs-row-desc">Switch between dark and light theme</span>
			</div>
			<button
				class="hs-toggle"
				class:hs-toggle--on={darkMode}
				type="button"
				role="switch"
				aria-checked={darkMode}
				on:click={toggleTheme}
			>
				<span class="hs-toggle-thumb" />
			</button>
		</div>

		<!-- Push Notifications toggle (mobile only) -->
		{#if pushMobile}
		<div class="hs-row">
			<div class="hs-row-info">
				<span class="hs-row-label">
					{#if pushEnabled}<Bell class="w-3.5 h-3.5 inline text-green-400 mr-1" />{:else}<BellOff class="w-3.5 h-3.5 inline text-gray-500 mr-1" />{/if}
					Push Notifications
				</span>
				<span class="hs-row-desc">Get notified about friend requests, updates, and more</span>
			</div>
			{#if pushLoading}
				<Loader size={16} class="text-purple-400 animate-spin" />
			{:else}
				<button
					class="hs-toggle"
					class:hs-toggle--on={pushEnabled}
					type="button"
					role="switch"
					aria-checked={pushEnabled}
					on:click={togglePush}
				>
					<span class="hs-toggle-thumb" />
				</button>
			{/if}
		</div>
		{/if}

		<!-- Toast feedback -->
		{#if toastMsg}
			<p class="hs-feedback" class:hs-feedback--ok={toastOk} class:hs-feedback--err={!toastOk}>
				{#if toastOk}<Check size={13} />{:else}<X size={13} />{/if}
				{toastMsg}
			</p>
		{/if}
	</div>
</div>

<style>
	.hs-card {
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 18px;
		padding: 1.5rem 1.5rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		backdrop-filter: blur(16px);
		transition: border-color 0.2s;
	}
	.hs-card-header {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
	}
	.hs-card-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.92);
		letter-spacing: -0.01em;
	}
	.hs-card-sub {
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.38);
	}

	.hs-body {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	/* Toggle row */
	.hs-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 0.9rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 12px;
	}
	.hs-row-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.hs-row-label {
		font-size: 0.84rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.82);
	}
	.hs-row-desc {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.35);
		line-height: 1.4;
	}
	.hs-badge {
		display: inline-block;
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		background: rgba(251,191,36,0.15);
		color: #fbbf24;
		border: 1px solid rgba(251,191,36,0.25);
		margin-left: 0.35rem;
		vertical-align: middle;
	}

	/* Toggle switch */
	.hs-toggle {
		position: relative;
		width: 40px;
		height: 22px;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 999px;
		cursor: pointer;
		transition:
			background 0.25s,
			border-color 0.25s;
		flex-shrink: 0;
		padding: 0;
	}
	.hs-toggle--on {
		background: linear-gradient(135deg, #a855f7, #ec4899);
		border-color: transparent;
	}
	.hs-toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		background: rgba(255, 255, 255, 0.7);
		border-radius: 50%;
		transition:
			transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
			background 0.25s;
		pointer-events: none;
	}
	.hs-toggle--on .hs-toggle-thumb {
		transform: translateX(18px);
		background: #fff;
	}

	/* Feedback */
	.hs-feedback {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.76rem;
		padding: 0.4rem 0.7rem;
		border-radius: 8px;
		margin: 0;
	}
	.hs-feedback--ok {
		background: rgba(74, 222, 128, 0.1);
		border: 1px solid rgba(74, 222, 128, 0.22);
		color: rgba(134, 239, 172, 0.95);
	}
	.hs-feedback--err {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.22);
		color: rgba(252, 165, 165, 0.95);
	}


</style>
