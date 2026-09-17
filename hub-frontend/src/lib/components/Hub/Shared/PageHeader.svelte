<script>
	import { Sparkles } from 'lucide-svelte';

	/**
	 * Shared page header component.
	 * @prop {constructor} icon - Lucide icon component (e.g. Home, Music)
	 * @prop {string} gradient - Gradient class from colors (e.g. colors.home)
	 * @prop {string} title - Page title
	 * @prop {string} description - Page description
	 * @prop {Array<{label: string, value: string|number, color?: string}>} [stats] - Optional stat badges
	 * @prop {boolean} [sparkles] - Show floating sparkle animations (Spotlight)
	 */
	export let icon;
	export let gradient;
	export let title;
	export let description;
	export let stats = [];
	export let sparkles = false;
</script>

<div class="relative">
	<div
		class="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-3xl blur-xl"
	></div>
	<div
		class="relative bg-gray-800/40 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-4 md:p-8"
	>
		<!-- Top row: icon + title column on left, stats on right -->
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-3 md:gap-4">
					<div class="relative flex-shrink-0">
						<div
							class="w-10 h-10 md:w-16 md:h-16 bg-gradient-to-r {gradient} rounded-xl md:rounded-2xl flex items-center justify-center shadow-2xl"
							class:spotlight-glow={sparkles}
						>
							<svelte:component this={icon} class="w-5 h-5 md:w-8 md:h-8 text-white" />
						</div>
						<div
							class="absolute inset-0 bg-gradient-to-r {gradient} opacity-20 rounded-xl md:rounded-2xl blur-lg scale-150"
						></div>

						{#if sparkles}
							<div class="absolute -top-2 -right-2 animate-bounce animation-delay-1000">
								<Sparkles class="w-3 h-3 md:w-4 md:h-4 text-red-400" />
							</div>
							<div class="absolute -bottom-1 -left-2 animate-bounce animation-delay-2000">
								<Sparkles class="w-2.5 h-2.5 md:w-3 md:h-3 text-pink-400" />
							</div>
						{/if}
					</div>

					<div class="min-w-0">
						<h1
							class="text-xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
						>
							{title}
						</h1>
						<p class="text-sm md:text-base text-gray-400 mt-0.5">
							{description}
						</p>
					</div>
				</div>
			</div>

			<!-- Stats on desktop (right side) -->
			{#if stats.length > 0}
				<div class="hidden md:flex gap-3 flex-shrink-0">
					{#each stats as stat}
						<div
							class="bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl px-4 py-2 text-center min-w-[80px]"
						>
							<div class="text-xl font-bold {stat.color ?? 'text-white'}">{stat.value}</div>
							<div class="text-xs text-gray-400">{stat.label}</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Stats on mobile (below description) -->
		{#if stats.length > 0}
			<div class="flex md:hidden gap-2 mt-3">
				{#each stats as stat}
					<div
						class="bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-lg px-3 py-1.5 text-center flex-1"
					>
						<div class="text-base font-bold {stat.color ?? 'text-white'}">{stat.value}</div>
						<div class="text-[10px] text-gray-400">{stat.label}</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.spotlight-glow {
		animation: pulse-glow 2s ease-in-out infinite alternate;
		box-shadow:
			0 0 15px rgba(239, 68, 68, 0.7),
			0 0 25px rgba(236, 72, 153, 0.5);
	}

	@keyframes pulse-glow {
		from {
			box-shadow:
				0 0 10px rgba(239, 68, 68, 0.5),
				0 0 20px rgba(236, 72, 153, 0.4);
		}
		to {
			box-shadow:
				0 0 25px rgba(239, 68, 68, 0.8),
				0 0 35px rgba(236, 72, 153, 0.6);
		}
	}

	.animation-delay-1000 {
		animation-delay: 1s;
	}

	.animation-delay-2000 {
		animation-delay: 2s;
	}
</style>
