<script>
	import { fade, fly } from 'svelte/transition';
	import {
		Shield,
		X,
		Loader2,
		Copy,
		CheckCircle2,
		Smartphone,
		Key,
		ArrowRight
	} from 'lucide-svelte';
	import { createEventDispatcher, onMount } from 'svelte';
	import API from '$lib/api.js';
	import { popupStore } from '$lib/stores/popup';
	import { login } from '$lib/stores/user';
	import { goto } from '$app/navigation';

	const dispatch = createEventDispatcher();

	export let show = false;
	export let tfaToken = '';
	export let userId = '';

	let step = 1;
	let processing = false;
	let setupData = null; // { secret, qrCodeUrl }
	let verifyCode = '';
	let copySuccess = false;

	async function startSetup() {
		processing = true;
		try {
			setupData = await API.setup2FA(tfaToken);
			step = 2;
		} catch (error) {
			popupStore.add(error.message, 'error');
		} finally {
			processing = false;
		}
	}

	async function handleEnable() {
		if (verifyCode.length !== 6) return;
		processing = true;
		try {
			const response = await API.enable2FA(verifyCode, tfaToken);
			popupStore.add('Two-factor authentication enabled successfully!', 'success');

			if (response.session) {
				localStorage.setItem('authToken', response.session.token);
				const freshData = await API.getCurrentUser();
				login({
					userId: freshData.userId,
					username: freshData.username,
					email: freshData.email,
					country: freshData.country,
					dateOfBirth: freshData.dateOfBirth,
					firstName: freshData.firstName,
					lastName: freshData.lastName,
					gender: freshData.gender,
					preferredLanguage: freshData.preferredLanguage,
					accountType: freshData.accountType,
					ageGroup: freshData.ageGroup,
					dateCreated: freshData.dateCreated,
					avatar: API.getAvatarUrl(freshData.avatarId || 1),
					notifications: 0,
					status: freshData.status || {},
					isAdmin: freshData.status.admin === true
				});
				goto('/hub');
			}
			dispatch('success');
		} catch (error) {
			popupStore.add(error.message, 'error');
		} finally {
			processing = false;
		}
	}

	function copyToClipboard(text) {
		navigator.clipboard.writeText(text);
		copySuccess = true;
		setTimeout(() => (copySuccess = false), 2000);
	}

	function close() {
		if (!processing) {
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
			<button class="modal-close" on:click={close} disabled={processing}>
				<X size={20} />
			</button>

			<div class="modal-header">
				<div class="icon-box">
					<Shield class="w-8 h-8 text-purple-400" />
				</div>
				<h2 class="modal-title text-white">Setup 2FA</h2>
				<p class="modal-desc">Two-factor authentication is mandatory for staff accounts.</p>
			</div>

			<div class="modal-body">
				{#if step === 1}
					<div class="setup-intro" in:fade>
						<div class="feature-list">
							<div class="feature-item">
								<div class="feature-icon"><Smartphone size={18} /></div>
								<div class="feature-text">
									<strong>Secure Access</strong>
									<span>Protect your account with a secondary code</span>
								</div>
							</div>
							<div class="feature-item">
								<div class="feature-icon"><CheckCircle2 size={18} /></div>
								<div class="feature-text">
									<strong>Mandatory for Staff</strong>
									<span>Ensuring the safety of the entire community</span>
								</div>
							</div>
						</div>
						<button class="primary-btn" on:click={startSetup} disabled={processing}>
							{#if processing}
								<Loader2 class="w-5 h-5 animate-spin" />
							{:else}
								Start Setup
								<ArrowRight size={18} />
							{/if}
						</button>
					</div>
				{:else if step === 2 && setupData}
					<div class="setup-qr" in:fade>
						<div class="qr-side">
							<div class="qr-container">
								<img src={setupData.qrCodeUrl} alt="2FA QR Code" />
							</div>
							<p class="text-[10px] text-gray-500 text-center uppercase tracking-widest">
								Scan with App
							</p>
						</div>

						<div class="form-side">
							<div class="manual-entry">
								<p class="section-label">Manual Secret</p>
								<div class="secret-box">
									<code>{setupData.secret}</code>
									<button on:click={() => copyToClipboard(setupData.secret)}>
										{#if copySuccess}
											<CheckCircle2 size={14} class="text-green-400" />
										{:else}
											<Copy size={14} />
										{/if}
									</button>
								</div>
							</div>
							<div class="code-input">
								<p class="section-label">Enter 6-digit code</p>
								<input
									type="text"
									bind:value={verifyCode}
									placeholder="000000"
									maxlength="6"
									class="verify-input"
								/>
							</div>
							<button
								class="primary-btn"
								on:click={handleEnable}
								disabled={processing || verifyCode.length !== 6}
							>
								{#if processing}
									<Loader2 class="w-5 h-5 animate-spin" />
								{:else}
									Complete Setup
								{/if}
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	* {
		box-sizing: border-box;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(12px);
		z-index: 99999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
	}

	.modal-content {
		width: 100%;
		max-width: 640px;
		background: #14141b;
		border: 1px solid rgba(168, 85, 247, 0.2);
		border-radius: 32px;
		padding: 2.5rem;
		position: relative;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		overflow: hidden;
	}

	.modal-close {
		position: absolute;
		top: 1.5rem;
		right: 1.5rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.5);
		width: 32px;
		height: 32px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}

	.modal-close:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border-color: rgba(239, 68, 68, 0.2);
	}

	.modal-header {
		text-align: left;
		margin-bottom: 2rem;
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.icon-box {
		width: 64px;
		height: 64px;
		background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1));
		border: 1px solid rgba(168, 85, 247, 0.2);
		border-radius: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.modal-title {
		font-size: 1.35rem;
		font-weight: 800;
		margin-bottom: 0.25rem;
		letter-spacing: -0.025em;
	}

	.modal-desc {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.4);
		line-height: 1.5;
	}

	.setup-qr {
		display: grid;
		grid-template-columns: 200px 1fr;
		gap: 2rem;
		align-items: start;
	}

	.qr-side,
	.form-side {
		min-width: 0; /* Prevent children from pushing parent width */
	}

	.qr-side {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.form-side {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.feature-list {
		display: grid;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.feature-item {
		display: flex;
		gap: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 16px;
	}

	.feature-icon {
		width: 36px;
		height: 36px;
		background: rgba(168, 85, 247, 0.1);
		color: #a855f7;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.feature-text strong {
		display: block;
		font-size: 0.9rem;
		color: #fff;
		margin-bottom: 0.125rem;
	}

	.feature-text span {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.primary-btn {
		width: 100%;
		padding: 1rem;
		background: linear-gradient(135deg, #a855f7, #ec4899);
		color: #fff;
		border: none;
		border-radius: 16px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		cursor: pointer;
		transition: all 0.3s;
		box-shadow: 0 10px 20px -5px rgba(168, 85, 247, 0.4);
	}

	.primary-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 15px 30px -10px rgba(168, 85, 247, 0.6);
		filter: brightness(1.1);
	}

	.primary-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	.qr-container {
		background: #fff;
		padding: 0.75rem;
		border-radius: 16px;
		width: fit-content;
		margin-bottom: 1rem;
	}

	.qr-container img {
		width: 150px;
		height: 150px;
	}

	.section-label {
		font-size: 0.7rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.3);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: 0.5rem;
	}

	.secret-box {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 0.6rem 0.8rem;
		border-radius: 12px;
		margin-bottom: 1.25rem;
	}

	.secret-box code {
		flex: 1;
		font-family: monospace;
		font-size: 0.75rem;
		color: #d8b4fe;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.secret-box button {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.5);
		width: 24px;
		height: 24px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}

	.verify-input {
		width: 100%;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 14px;
		padding: 0.85rem;
		text-align: center;
		font-size: 1.25rem;
		font-weight: 700;
		font-family: monospace;
		letter-spacing: 0.4rem;
		color: #fff;
		margin-bottom: 1.25rem;
		transition: all 0.3s;
	}

	.verify-input:focus {
		outline: none;
		border-color: #a855f7;
		background: rgba(168, 85, 247, 0.05);
		box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.1);
	}
</style>
