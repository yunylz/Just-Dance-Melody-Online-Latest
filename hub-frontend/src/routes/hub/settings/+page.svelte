<script>
	import Utils from '$lib/utils';
	import {
		Settings,
		Globe,
		Shield,
		Eye,
		EyeOff,
		Volume2,
		Bell,
		Palette,
		Monitor,
		Lock,
		ChevronRight
	} from 'lucide-svelte';
	import { user } from '$lib/stores/user';

	const languages = [
		{ code: 'en', name: 'English', flag: '🇺🇸' },
		{ code: 'es', name: 'Español', flag: '🇪🇸' },
		{ code: 'fr', name: 'Français', flag: '🇫🇷' },
		{ code: 'it', name: 'Italiano', flag: '🇮🇹' },
		{ code: 'de', name: 'Deutsch', flag: '🇩🇪' },
		{ code: 'pt', name: 'Português', flag: '🇵🇹' }
	];

	let selectedLanguage = 'en';
	let autodancePrivacy = 'private';
	let soundVolume = 75;
	let musicVolume = 85;
	let enableNotifications = true;
	let enableVibration = true;
	let theme = 'dark';
	let autoSave = true;
	let showTutorials = true;

	function saveSettings() {
		// Mock save functionality
		console.log('Settings saved!');
		// Could dispatch an event or call an API here
	}

	// Auto-save when certain settings change
	$: if (selectedLanguage || autodancePrivacy) {
		saveSettings();
	}
</script>

<svelte:head>
	<title>{Utils.getTitle('Settings', true)}</title>
</svelte:head>

<!-- Background with floating orbs -->
<div class="relative min-h-screen overflow-hidden">
	<!-- Animated background orbs -->
	<div
		class="absolute top-32 left-20 w-40 h-40 bg-blue-500/8 rounded-full blur-3xl animate-pulse"
	></div>
	<div
		class="absolute top-80 right-32 w-36 h-36 bg-purple-500/8 rounded-full blur-3xl animate-pulse animation-delay-2000"
	></div>
	<div
		class="absolute bottom-40 left-1/4 w-32 h-32 bg-pink-500/8 rounded-full blur-3xl animate-pulse animation-delay-4000"
	></div>

	<!-- Main content -->
	<div class="relative z-10 p-8 space-y-8">
		<!-- Header -->
		<div class="relative">
			<div
				class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl blur-xl"
			></div>
			<div
				class="relative bg-gray-800/40 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-8"
			>
				<div class="flex items-center gap-4">
					<div class="relative">
						<div
							class="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-2xl"
						>
							<Settings class="w-8 h-8 text-white" />
						</div>
						<div
							class="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-500/20 rounded-2xl blur-lg scale-150"
						></div>
					</div>
					<div>
						<h1
							class="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
						>
							Settings
						</h1>
						<p class="text-gray-400 mt-2">Customize your Just Dance Melody Online experience.</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Settings Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
			<!-- Language Settings -->
			<div
				class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 transition-all duration-300 hover:border-purple-400/50"
			>
				<div class="flex items-center gap-3 mb-6">
					<div
						class="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg"
					>
						<Globe class="w-6 h-6 text-white" />
					</div>
					<h2 class="text-2xl font-bold text-white">Language</h2>
				</div>

				<div class="space-y-4">
					<p class="text-gray-400 text-sm">Choose your preferred language for the interface</p>

					<div class="relative group/select">
						<select
							bind:value={selectedLanguage}
							class="w-full appearance-none bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl px-4 py-4 text-white focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 cursor-pointer hover:border-blue-400/30"
						>
							{#each languages as lang}
								<option value={lang.code} class="bg-gray-800 text-white">
									{lang.flag}
									{lang.name}
								</option>
							{/each}
						</select>
						<!-- Custom dropdown arrow -->
						<div
							class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-focus-within/select:text-blue-400 transition-colors"
						>
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
					</div>

					<div class="text-xs text-green-400 opacity-0 animate-fade-in">
						✓ Language updated automatically
					</div>
				</div>
			</div>

			<!-- Privacy Settings -->
			<div
				class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 transition-all duration-300 hover:border-purple-400/50"
			>
				<div class="flex items-center gap-3 mb-6">
					<div
						class="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg"
					>
						<Shield class="w-6 h-6 text-white" />
					</div>
					<h2 class="text-2xl font-bold text-white">Privacy</h2>
				</div>

				<div class="space-y-6">
					<!-- Autodance Privacy -->
					<div class="space-y-4">
						<div class="flex items-center gap-2">
							<h3 class="font-semibold text-white">Autodance Visibility on Hub</h3>
							{#if autodancePrivacy === 'public'}
								<Eye class="w-4 h-4 text-green-400" />
							{:else}
								<EyeOff class="w-4 h-4 text-orange-400" />
							{/if}
						</div>
						<p class="text-gray-400 text-sm">Control who can see your recorded dances</p>

						<div class="space-y-3">
							<label class="flex items-center gap-3 cursor-pointer group">
								<input
									type="radio"
									bind:group={autodancePrivacy}
									value="public"
									class="w-4 h-4 text-green-500 bg-gray-700 border-gray-600 focus:ring-green-400/20 focus:ring-2"
								/>
								<div class="flex-1">
									<span class="text-white group-hover:text-green-300 transition-colors"
										>Public by default</span
									>
									<p class="text-xs text-gray-400">Anyone can see your autodances</p>
								</div>
							</label>

							<label class="flex items-center gap-3 cursor-pointer group">
								<input
									type="radio"
									bind:group={autodancePrivacy}
									value="private"
									class="w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 focus:ring-orange-400/20 focus:ring-2"
								/>
								<div class="flex-1">
									<span class="text-white group-hover:text-orange-300 transition-colors"
										>Private by default</span
									>
									<p class="text-xs text-gray-400">Only you can see your autodances initially</p>
								</div>
							</label>
						</div>
					</div>

					<div
						class="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3"
					>
						💡 This setting applies to all current and future autodances on the hub.
					</div>
				</div>
			</div>

			<!-- Security Settings -->
			<div
				class="bg-gray-800/50 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 transition-all duration-300 hover:border-purple-400/50"
			>
				<div class="flex items-center gap-3 mb-6">
					<div
						class="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg"
					>
						<Lock class="w-6 h-6 text-white" />
					</div>
					<h2 class="text-2xl font-bold text-white">Security</h2>
				</div>

				<div class="space-y-6">
					<div class="space-y-4">
						<h3 class="font-semibold text-white">Two-Factor Authentication</h3>
						<p class="text-gray-400 text-sm">Add an extra layer of security to your account.</p>

						<a
							href="/hub/profile?setup2fa=true"
							class="flex items-center justify-between w-full p-4 bg-gray-700/50 hover:bg-gray-700 border border-gray-600/50 rounded-2xl transition-all group"
						>
							<div class="flex items-center gap-3">
								<Shield class="w-5 h-5 text-purple-400" />
								<span class="text-white font-medium">Manage 2FA</span>
							</div>
							<div class="flex items-center gap-2">
								<span
									class="text-xs font-bold px-2 py-0.5 rounded-full {$user?.status?.twoFactorEnabled
										? 'bg-green-500/20 text-green-400'
										: 'bg-red-500/20 text-red-400'}"
								>
									{$user?.status?.twoFactorEnabled ? 'ACTIVE' : 'INACTIVE'}
								</span>
								<ChevronRight
									class="w-4 h-4 text-gray-500 group-hover:translate-x-1 transition-transform"
								/>
							</div>
						</a>
					</div>

					<div class="text-xs text-gray-500 italic">Recommended for all staff and moderators.</div>
				</div>
			</div>
		</div>

		<!-- Save All Button -->
		<div class="flex justify-center">
			<button
				on:click={saveSettings}
				class="group bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold px-8 py-4 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-3"
			>
				<Settings class="w-5 h-5" />
				Save All Settings
				<div class="w-0 group-hover:w-6 transition-all duration-300 overflow-hidden">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"
						></path>
					</svg>
				</div>
			</button>
		</div>
	</div>
</div>

<style>
	/* Animation delays */
	.animation-delay-2000 {
		animation-delay: 2s;
	}
	.animation-delay-4000 {
		animation-delay: 4s;
	}

	/* Custom range slider styling */
	.slider::-webkit-slider-thumb {
		appearance: none;
		height: 20px;
		width: 20px;
		border-radius: 50%;
		background: #ffffff;
		border: 2px solid #8b5cf6;
		cursor: pointer;
		box-shadow: 0 4px 8px rgba(139, 92, 246, 0.3);
		transition: all 0.2s ease;
	}

	.slider::-webkit-slider-thumb:hover {
		transform: scale(1.1);
		box-shadow: 0 6px 12px rgba(139, 92, 246, 0.4);
	}

	.slider::-moz-range-thumb {
		height: 20px;
		width: 20px;
		border-radius: 50%;
		background: #ffffff;
		border: 2px solid #8b5cf6;
		cursor: pointer;
		box-shadow: 0 4px 8px rgba(139, 92, 246, 0.3);
	}

	/* Custom scrollbar */
	::-webkit-scrollbar {
		width: 6px;
		height: 6px;
	}

	::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.1);
		border-radius: 3px;
	}

	::-webkit-scrollbar-thumb {
		background: linear-gradient(to bottom, #8b5cf6, #ec4899);
		border-radius: 3px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(to bottom, #7c3aed, #db2777);
	}

	/* Fade in animation */
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.animate-fade-in {
		animation: fade-in 0.5s ease-out;
	}

	/* Smooth transitions */
	select,
	input,
	button {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Select dropdown styling */
	select option {
		background-color: #1f2937;
		color: white;
		padding: 8px;
	}

	/* Radio button custom styling */
	input[type='radio']:checked {
		background-color: currentColor;
		border-color: currentColor;
	}

	/* Checkbox toggle animations */
	input[type='checkbox']:checked + div {
		background: linear-gradient(to right, var(--tw-gradient-from), var(--tw-gradient-to));
	}
</style>
