<script>
	import { onMount } from 'svelte';
	import { X, Smartphone, Share2, Download } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	let show = false;
	let isStandalone = false;
	let installPrompt = null;
	let isIOS = false;
	let showInstructions = false;

	onMount(() => {
		// Check if already running as installed PWA
		isStandalone = window.matchMedia('(display-mode: standalone)').matches
			|| window.navigator.standalone === true;

		if (isStandalone) return;

		// Detect iOS Safari
		isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

		// Capture the install prompt for Chrome (Android)
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			installPrompt = e;
		});

		// Show banner after a short delay — always, unless installed
		setTimeout(() => { show = true; }, 2000);
	});

	function close() {
		show = false;
		showInstructions = false;
	}

	async function handleInstall() {
		if (installPrompt) {
			// Chrome Android: trigger native install dialog
			installPrompt.prompt();
			const result = await installPrompt.userChoice;
			if (result.outcome === 'accepted') {
				show = false;
			}
			installPrompt = null;
		} else {
			// No native prompt available — show step-by-step instructions
			showInstructions = true;
		}
	}
</script>

{#if show && !isStandalone}
	<div
		class="md:hidden mb-3"
		in:fly={{ y: -60, duration: 400 }}
		out:fade={{ duration: 200 }}
	>
		<div class="mx-3 mt-3 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
			{#if showInstructions}
				<!-- Step-by-step instructions -->
				<div class="p-4">
					<div class="flex items-center gap-3 mb-3">
						<div class="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
							<Download class="w-5 h-5 text-white" />
						</div>
						<p class="text-sm font-semibold text-white">Add to Home Screen</p>
					</div>

					{#if isIOS}
						<div class="space-y-3">
							<div class="flex items-start gap-3">
								<span class="flex-shrink-0 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300">1</span>
								<p class="text-xs text-gray-300 leading-relaxed">Tap the <strong class="text-white">Share</strong> button <Share2 class="inline w-3.5 h-3.5 text-blue-400" /> in the browser toolbar.</p>
							</div>
							<div class="flex items-start gap-3">
								<span class="flex-shrink-0 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300">2</span>
								<p class="text-xs text-gray-300 leading-relaxed">Scroll down and tap <strong class="text-white">Add to Home Screen</strong>.</p>
							</div>
							<div class="flex items-start gap-3">
								<span class="flex-shrink-0 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300">3</span>
								<p class="text-xs text-gray-300 leading-relaxed">Tap <strong class="text-white">Add</strong> in the top right corner.</p>
							</div>
						</div>
					{:else}
						<div class="space-y-3">
							<div class="flex items-start gap-3">
								<span class="flex-shrink-0 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300">1</span>
								<p class="text-xs text-gray-300 leading-relaxed">Open the browser <strong class="text-white">menu</strong> (three dots ⋮).</p>
							</div>
							<div class="flex items-start gap-3">
								<span class="flex-shrink-0 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300">2</span>
								<p class="text-xs text-gray-300 leading-relaxed">Tap <strong class="text-white">Add to Home screen</strong> or <strong class="text-white">Install app</strong>.</p>
							</div>
							<div class="flex items-start gap-3">
								<span class="flex-shrink-0 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300">3</span>
								<p class="text-xs text-gray-300 leading-relaxed">Tap <strong class="text-white">Add</strong> — it'll appear on your home screen!</p>
							</div>
						</div>
					{/if}

					<button
						on:click={close}
						class="mt-4 w-full py-2 bg-gray-800 text-gray-400 text-xs font-medium rounded-xl hover:text-white transition-colors"
					>
						Got it!
					</button>
				</div>
			{:else}
				<!-- Main banner -->
				<div class="flex items-start gap-3 p-4">
					<div class="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
						<Smartphone class="w-5 h-5 text-white" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-semibold text-white">Install JDMO Hub</p>
						<p class="text-xs text-gray-400 mt-0.5 leading-relaxed">
							Add to your home screen for the best experience — it works just like a native app!
						</p>
						<div class="flex items-center gap-2 mt-3">
							<button
								on:click={handleInstall}
								class="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
							>
								{installPrompt ? 'Install' : 'How to Add'}
							</button>
							<button
								on:click={close}
								class="px-3 py-1.5 bg-gray-800 text-gray-400 text-xs font-medium rounded-lg hover:text-white transition-colors"
							>
								Dismiss
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
			{/if}
		</div>
	</div>
{/if}
