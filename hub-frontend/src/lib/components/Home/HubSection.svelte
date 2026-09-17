<script>
	import Icon from '@iconify/svelte';
	import { openDownloadModal } from '$lib/stores/downloadModal.js';
</script>

<section
	id="hub"
	class="relative py-32 bg-gradient-to-br from-gray-900 via-violet-900/20 to-gray-900 text-white overflow-hidden"
>
	<!-- Background decorations -->
	<div class="absolute inset-0">
		<div
			class="absolute top-20 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse"
		></div>
		<div
			class="absolute bottom-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000"
		></div>
	</div>

	<div class="relative z-10 container mx-auto px-6 md:px-12 max-w-7xl">
		<!-- Section Header -->
		<div class="text-center mb-20">
			<h2
				class="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent"
			>
				Hub
			</h2>
			<div
				class="w-32 h-1 bg-gradient-to-r from-violet-500 to-purple-500 mx-auto rounded-full mb-8"
			></div>
			<p class="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
				Your dashboard for everything JDMO!
			</p>
		</div>

		<!-- Hub Card -->
		<div class="max-w-4xl mx-auto">
			<div
				class="group relative bg-gradient-to-br from-gray-800/40 to-violet-900/20 backdrop-blur-lg rounded-3xl shadow-2xl p-12 border border-gray-700/50 hover:border-violet-400/50 transform hover:scale-105 transition-all duration-500 overflow-hidden"
			>
				<!-- Card glow effect -->
				<div
					class="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-500 opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity duration-500 pointer-events-none"
				></div>

				<div class="grid md:grid-cols-2 gap-8 items-center">
					<!-- Left side - Icon and description -->
					<div>
						<div class="relative mb-6">
							<div
								class="w-24 h-24 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-all duration-300 shadow-xl"
							>
								<Icon icon="material-symbols:dashboard-outline" width="48" height="48" class="text-white" />
							</div>
						</div>

						<h3
							class="text-3xl font-black mb-4 text-white group-hover:text-violet-300 transition-colors duration-300"
						>
							JDMO Hub
						</h3>

						<p
							class="text-gray-300 group-hover:text-gray-200 transition-colors duration-300 leading-relaxed mb-6"
						>
							A centralized place where the players can view their status, track live World Dance
							Floor data, check leaderboards, and follow the latest news. Use it on the web —
							or download the desktop app for even more.
						</p>
					</div>

					<!-- Right side - Features -->
					<div class="space-y-3">
						<div
							class="flex items-start gap-3 p-4 bg-violet-500/10 rounded-xl border border-violet-500/20"
						>
							<svg
								class="w-6 h-6 text-violet-400 flex-shrink-0 mt-0.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								></path>
							</svg>
							<div>
								<h4 class="text-white font-semibold mb-1">Player Status</h4>
								<p class="text-gray-400 text-sm">Track your profile and progress</p>
							</div>
						</div>

						<div
							class="flex items-start gap-3 p-4 bg-violet-500/10 rounded-xl border border-violet-500/20"
						>
							<svg
								class="w-6 h-6 text-violet-400 flex-shrink-0 mt-0.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
							<div>
								<h4 class="text-white font-semibold mb-1">Live World Dance Floor</h4>
								<p class="text-gray-400 text-sm">Real-time global activity and stats</p>
							</div>
						</div>

						<div
							class="flex items-start gap-3 p-4 bg-violet-500/10 rounded-xl border border-violet-500/20"
						>
							<svg
								class="w-6 h-6 text-violet-400 flex-shrink-0 mt-0.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
								></path>
							</svg>
							<div>
								<h4 class="text-white font-semibold mb-1">Leaderboards & News</h4>
								<p class="text-gray-400 text-sm">Stay updated with latest rankings</p>
							</div>
						</div>

						<!-- Desktop-only features: compact side-by-side pair -->
						<div class="relative pt-1">
							<span
								class="absolute -top-1 left-4 px-2 py-0.5 bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white text-[10px] font-bold uppercase tracking-wide rounded-full shadow z-10"
							>
								Desktop only
							</span>
							<div
								class="grid grid-cols-2 gap-3 p-4 pt-5 bg-gradient-to-r from-fuchsia-500/10 to-violet-500/10 rounded-xl border border-fuchsia-500/30"
							>
								<div class="flex flex-col items-start gap-1.5">
									<svg
										class="w-5 h-5 text-fuchsia-400 flex-shrink-0"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
										></path>
									</svg>
									<h4 class="text-white font-semibold text-sm">Game Launcher</h4>
									<p class="text-gray-400 text-xs leading-snug">Download, update & launch your games</p>
								</div>

								<div class="flex flex-col items-start gap-1.5 border-l border-fuchsia-500/20 pl-3">
									<Icon icon="ic:baseline-discord" width="20" height="20" class="text-fuchsia-400 flex-shrink-0" />
									<h4 class="text-white font-semibold text-sm">Discord Presence</h4>
									<p class="text-gray-400 text-xs leading-snug">Sync what you're playing to Discord</p>
								</div>
							</div>
						</div>

						<a
							href="/hub"
							class="relative inline-flex items-center gap-2 w-full justify-center px-6 py-4 mt-4 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/50 hover:border-violet-400 rounded-full text-violet-300 hover:text-violet-200 font-semibold transition-all duration-300 backdrop-blur-sm z-20"
						>
							Visit Hub
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 7l5 5m0 0l-5 5m5-5H6"
								></path>
							</svg>
						</a>
					</div>
				</div>

				<!-- Animated border -->
				<div
					class="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-violet-400/30 transition-colors duration-300 pointer-events-none"
				></div>
			</div>
		</div>

		<div class="text-center mt-8 flex flex-wrap items-center justify-center gap-6">
			<a href="/tutorial?section=what-is-hub" class="text-gray-400 hover:text-white text-lg transition-colors duration-200">
				What is the Hub? <span class="text-purple-400">→</span>
			</a>
			<span class="text-gray-600 hidden sm:inline">·</span>
			<button
				on:click={openDownloadModal}
				class="inline-flex items-center gap-2 text-fuchsia-300 hover:text-fuchsia-200 text-lg font-semibold transition-colors duration-200 cursor-pointer"
			>
				Download Desktop <span class="text-purple-400">→</span>
			</button>
		</div>
	</div>
</section>

<style>
	.animation-delay-2000 {
		animation-delay: 2s;
	}
</style>