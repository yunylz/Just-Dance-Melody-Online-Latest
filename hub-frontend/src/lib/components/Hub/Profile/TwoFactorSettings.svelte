<script>
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import {
		Shield,
		ShieldCheck,
		ShieldAlert,
		Copy,
		Loader2,
		Lock,
		CheckCircle2,
		Smartphone,
		Key
	} from 'lucide-svelte';
	import API from '$lib/api.js';
	import { popupStore } from '$lib/stores/popup';
	import { login } from '$lib/stores/user';
	import { goto } from '$app/navigation';

	export let userData;
	export let tfaToken = null;

	let processing = false;
	let setupData = null; // { secret, qrCodeUrl }
	let verifyCode = '';

	$: isEnabled = userData?.status?.twoFactorEnabled || false;

	async function startSetup() {
		processing = true;
		try {
			setupData = await API.setup2FA(tfaToken);
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
			
			// If we got a session back, it means we were in mandatory setup mode
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
				return;
			}

			isEnabled = true;
			setupData = null;
			verifyCode = '';
			// Update local status if possible (parent will refresh anyway)
			if (userData?.status) userData.status.twoFactorEnabled = true;
		} catch (error) {
			popupStore.add(error.message, 'error');
		} finally {
			processing = false;
		}
	}

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	async function handleDisable() {
		if (verifyCode.length !== 6) {
			popupStore.add('Please enter your current 2FA code to disable it.', 'warning');
			return;
		}
		dispatch('requestDisable', { code: verifyCode });
	}

	export async function finishDisable() {
		isEnabled = false;
		verifyCode = '';
		if (userData?.status) userData.status.twoFactorEnabled = false;
	}

	function copyToClipboard(text) {
		navigator.clipboard.writeText(text);
		popupStore.add('Secret key copied to clipboard', 'success');
	}
</script>

<div
	class="bg-gray-800/40 backdrop-blur-xl border border-purple-500/20 rounded-3xl overflow-hidden"
>
	<div class="p-6 border-b border-purple-500/10 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<!-- <div class="p-2 bg-purple-500/20 rounded-xl">
				<Lock class="w-5 h-5 text-purple-400" />
			</div> -->
			<h2 class="text-xl font-bold text-white">Two-Factor Authentication</h2>
		</div>
		<div class="flex items-center gap-2">
			<span
				class="text-xs font-bold px-2 py-0.5 rounded-full {isEnabled
					? 'bg-green-500/20 text-green-400'
					: 'bg-red-500/20 text-red-400'}"
			>
				{isEnabled ? 'ACTIVE' : 'INACTIVE'}
			</span>
		</div>
	</div>

	<div class="p-6">
		{#if isEnabled && !setupData}
			<div class="flex flex-col md:flex-row items-center gap-6" in:fade>
				<div
					class="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center shrink-0"
				>
					<ShieldCheck class="w-10 h-10 text-green-400" />
				</div>
				<div class="flex-1 text-center md:text-left space-y-2">
					<h3 class="text-lg font-bold text-white">Your account is secured</h3>
					<p class="text-sm text-gray-400">
						Two-factor authentication is protecting your account from unauthorized access.
					</p>
				</div>
				<div class="w-full md:w-48 space-y-3">
					<input
						type="text"
						bind:value={verifyCode}
						placeholder="6-digit code"
						maxlength="6"
						class="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-3 py-2 text-center font-mono text-white focus:border-red-500/50 transition-all"
					/>
					<button
						on:click={handleDisable}
						disabled={processing || verifyCode.length !== 6}
						class="w-full px-6 py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
					>
						Disable 2FA
					</button>
				</div>
			</div>
		{:else if setupData}
			<div class="space-y-6" in:fly={{ y: 20 }}>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
					<div class="space-y-4">
						<div class="flex items-center gap-2 text-purple-300 font-semibold">
							<span
								class="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs"
								>1</span
							>
							Scan QR Code
						</div>
						<div class="p-3 bg-white rounded-2xl w-fit mx-auto md:mx-0">
							<img src={setupData.qrCodeUrl} alt="QR Code" class="w-40 h-40" />
						</div>
						<div class="space-y-2">
							<p class="text-xs text-gray-400 font-semibold">OR ENTER MANUALLY</p>
							<div
								class="flex items-center gap-2 bg-gray-900/50 border border-gray-700 rounded-xl p-2"
							>
								<code class="flex-1 text-purple-300 font-mono text-xs truncate"
									>{setupData.secret}</code
								>
								<button
									on:click={() => copyToClipboard(setupData.secret)}
									class="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400"
								>
									<Copy class="w-3.5 h-3.5" />
								</button>
							</div>
						</div>
					</div>

					<div class="space-y-4">
						<div class="flex items-center gap-2 text-purple-300 font-semibold">
							<span
								class="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs"
								>2</span
							>
							Verify & Enable
						</div>
						<p class="text-sm text-gray-400">
							Enter the 6-digit code from your authenticator app to complete setup.
						</p>
						<input
							type="text"
							bind:value={verifyCode}
							placeholder="000000"
							maxlength="6"
							class="w-full bg-gray-900/50 border border-purple-500/30 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.3em] font-mono focus:border-purple-500 focus:outline-none transition-all"
						/>
						<button
							on:click={handleEnable}
							disabled={processing || verifyCode.length !== 6}
							class="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
						>
							{#if processing}
								<Loader2 class="w-5 h-5 animate-spin mx-auto" />
							{:else}
								Complete Setup
							{/if}
						</button>
						<button
							on:click={() => (setupData = null)}
							class="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors"
						>
							Cancel Setup
						</button>
					</div>
				</div>
			</div>
		{:else}
			<div class="flex flex-col md:flex-row items-center gap-6" in:fade>
				<div
					class="w-20 h-20 bg-gray-900/50 rounded-full flex items-center justify-center shrink-0"
				>
					<Shield class="w-10 h-10 text-gray-600" />
				</div>
				<div class="flex-1 text-center md:text-left space-y-2">
					<h3 class="text-lg font-bold text-white">Enhanced Security</h3>
					<p class="text-sm text-gray-400">Add an extra layer of protection to your account.</p>
				</div>
				<button
					on:click={startSetup}
					disabled={processing}
					class="w-full md:w-auto px-8 py-3 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-purple-500/50 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
				>
					{#if processing}
						<Loader2 class="w-5 h-5 animate-spin" />
					{:else}
						<Key class="w-5 h-5" />
					{/if}
					Enable 2FA
				</button>
			</div>
		{/if}
	</div>
</div>
