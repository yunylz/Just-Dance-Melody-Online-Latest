<script>
	import { onMount } from 'svelte';
	import { Bell, X, Smartphone } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import Utils from '$lib/utils';
	import { subscribePush, isPushSubscribed } from '$lib/push';

	let show = false;
	let isSubscribed = false;
	let isIOS = false;
	let isStandalone = false;
	let pushSupported = false;

	onMount(async () => {
		if (!Utils.isMobile()) return;
		isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
		isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

		if (isIOS && !isStandalone) return;
		if (typeof window.Notification === 'undefined') return;

		if (Notification.permission === 'denied') return;

		isSubscribed = await isPushSubscribed();
		if (isSubscribed) return;

		if (sessionStorage.getItem('pushBannerDismissed')) return;

		pushSupported = true;
		setTimeout(() => { show = true; }, 4000);
	});

	function close() {
		show = false;
		sessionStorage.setItem('pushBannerDismissed', 'true');
	}

	async function handleEnable() {
		show = false;
		const ok = await subscribePush();
		if (ok) isSubscribed = true;
	}
</script>

{#if show && pushSupported && !isSubscribed}
	<div
		class="mb-3"
		in:fly={{ y: -60, duration: 400 }}
		out:fade={{ duration: 200 }}
	>
		<div class="mx-3 mt-3 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
			<div class="flex items-start gap-3 p-4">
				<div class="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
					<Bell class="w-5 h-5 text-white" />
				</div>
				<div class="flex-1 min-w-0">
					<p class="text-sm font-semibold text-white">Get Notified</p>
					<p class="text-xs text-gray-400 mt-0.5 leading-relaxed">
						Enable push notifications to know when you get friend requests, updates, and more!
					</p>
					<div class="flex items-center gap-2 mt-3">
						<button
							on:click={handleEnable}
							class="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
						>
							Enable Notifications
						</button>
						<button
							on:click={close}
							class="px-3 py-1.5 bg-gray-800 text-gray-400 text-xs font-medium rounded-lg hover:text-white transition-colors"
						>
							Not now
						</button>
					</div>
				</div>
				<button
					on:click={close}
					class="flex-shrink-0 text-gray-500 hover:text-white transition-colors"
					aria-label="Dismiss"
				>
					<X class="w-4 h-4" />
				</button>
			</div>
		</div>
	</div>
{/if}
