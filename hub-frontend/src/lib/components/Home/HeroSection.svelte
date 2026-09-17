<script>
	import { isLoggedIn } from '$lib/stores/user';
	import { openDownloadModal } from '$lib/stores/downloadModal.js';
</script>

<section class="relative w-full h-screen overflow-hidden -mt-20">
	<img src="/splash_bg.jpg" alt="Background" class="absolute inset-0 w-full h-full object-cover" />

	<!-- Shadow overlay for readability -->
	<div
		class="absolute inset-0 bg-gradient-to-r from-purple-950/80 via-pink-950/40 to-transparent"
	></div>

	<div
		class="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 h-full px-6 md:px-12 pt-20 max-w-7xl mx-auto"
	>
		<!-- Left Content -->
		<div class="flex flex-col justify-center text-center lg:text-left">
			<h1
				class="text-4xl md:text-6xl lg:text-5xl font-black mb-6 leading-tight animate-fade-up animation-delay-300"
			>
				<span class="text-white">Enjoy access to</span><br />
				<span class="text-transparent text-brand-gradient bg-clip-text"
					>1500+ Songs!</span
				>
			</h1>

			<p
				class="text-lg md:text-xl text-gray-300 max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed animate-fade-up animation-delay-500"
			>
				Chart-topping hits to all-time classics all in one place, fast, reliable and secure
				<span
					class="text-transparent text-brand-gradient bg-clip-text font-semibold"
				>
					Just Dance Melody Online</span
				>  is the world's #1 on-demand dance streaming service.
			</p>

			<div class="animate-fade-up animation-delay-700 flex flex-wrap gap-4 justify-center lg:justify-start">
				<a
					href='/tutorial'
					class="inline-flex items-center gap-3 px-8 py-4 bg-brand-gradient text-white font-bold text-lg rounded-full shadow-2xl shadow-purple-500/20 hover:shadow-purple-500/40 hover:opacity-90 transition-all duration-300 hover:scale-105 will-change-transform"
				>
					Get Started
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 7l5 5m0 0l-5 5m5-5H6"
						></path>
					</svg>
				</a>
				<button
					on:click={openDownloadModal}
					class="group inline-flex items-center gap-3 px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-lg rounded-full shadow-2xl shadow-black/20 hover:bg-white/20 hover:border-purple-400/50 hover:shadow-purple-500/30 transition-all duration-300 hover:scale-105 will-change-transform"
				>
					<!-- Download icon -->
					<svg
						class="w-5 h-5 transition-transform duration-300 group-hover:translate-y-0.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4"
						></path>
					</svg>
					<span>Download Hub for Desktop</span>
					<!-- OS badges -->
					<span
						class="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300"
					>
						<span class="opacity-60 group-hover:opacity-100 transition-opacity">Windows</span>
						<span class="text-gray-500">·</span>
						<span class="opacity-60 group-hover:opacity-100 transition-opacity">macOS</span>
					</span>
				</button>
			</div>
		</div>

		<!-- Right Content - Coaches -->
		<div class="hidden lg:flex items-center justify-center overflow-visible">
			<img
				src="/assets/coaches.png"
				alt="Coaches"
				class="w-full object-contain scale-125 -translate-x-[5%] translate-y-[12%] animate-fade-up animation-delay-1000"
			/>
		</div>
	</div>

	<!-- Scroll indicator -->
	<!-- <div class="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
		<div class="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
			<div class="w-1.5 h-3 bg-white/50 rounded-full animate-scroll"></div>
		</div>
	</div> -->
</section>

<style>
	.animation-delay-300 {
		animation-delay: 0.3s;
	}

	.animation-delay-500 {
		animation-delay: 0.5s;
	}

	.animation-delay-700 {
		animation-delay: 0.7s;
	}

	.animation-delay-1000 {
		animation-delay: 1s;
	}

	@keyframes fadeUp {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes scroll {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		40% {
			opacity: 1;
		}
		80% {
			transform: translateY(12px);
			opacity: 0;
		}
		100% {
			opacity: 0;
		}
	}

	.animate-fade-up {
		animation: fadeUp 0.8s ease forwards;
	}

	.animate-scroll {
		animation: scroll 2s ease-in-out infinite;
	}
</style>
