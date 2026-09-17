<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fly, fade } from 'svelte/transition';
	import { toast } from '$lib/toast';
	import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-svelte';

	const icons = {
		success: CheckCircle2,
		error: AlertCircle,
		info: Info,
		warning: AlertTriangle
	};

	const colors = {
		success: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
		error: 'text-rose-400 border-rose-500/20 bg-rose-500/10',
		info: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/10',
		warning: 'text-amber-400 border-amber-500/20 bg-amber-500/10'
	};
</script>

<div class="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none">
	{#each $toast as t (t.id)}
		<div
			animate:flip={{ duration: 300 }}
			in:fly={{ x: 100, duration: 400, opacity: 0 }}
			out:fade={{ duration: 200 }}
			class="pointer-events-auto relative overflow-hidden rounded-xl border backdrop-blur-md shadow-2xl p-4 flex items-start gap-3 group {colors[t.type]}"
		>
			<div class="mt-0.5">
				<svelte:component this={icons[t.type]} size={20} />
			</div>
			
			<div class="flex-1">
				<p class="text-sm font-medium leading-relaxed">
					{t.message}
				</p>
			</div>

			<button
				onclick={() => toast.remove(t.id)}
				class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded-md"
			>
				<X size={16} />
			</button>

			{#if t.duration && t.duration > 0}
				<div 
					class="absolute bottom-0 left-0 h-0.5 bg-current/30 w-full origin-left"
					style:animation="shrink {t.duration}ms linear forwards"
				></div>
			{/if}
		</div>
	{/each}
</div>

<style>
	@keyframes shrink {
		from { transform: scaleX(1); }
		to { transform: scaleX(0); }
	}
</style>
