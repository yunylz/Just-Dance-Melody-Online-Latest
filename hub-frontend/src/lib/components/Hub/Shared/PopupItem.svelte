<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import { CheckCircle, AlertTriangle, Info, ShieldAlert, X } from 'lucide-svelte';

	const dispatch = createEventDispatcher();

	export let id;
	export let message = '';
	export let type = 'success';

	const icons = {
		success: {
			icon: CheckCircle,
			color: 'text-green-400',
			bg: 'bg-green-500/20',
			border: 'border-green-400/30'
		},
		error: {
			icon: ShieldAlert,
			color: 'text-red-400',
			bg: 'bg-red-500/20',
			border: 'border-red-400/30'
		},
		warning: {
			icon: AlertTriangle,
			color: 'text-yellow-400',
			bg: 'bg-yellow-500/20',
			border: 'border-yellow-400/30'
		},
		info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' }
	};

	const config = icons[type] || icons.success;

	function close() {
		dispatch('remove', id);
	}
</script>

<div class="relative group" transition:fly={{ y: 20, duration: 300 }}>
	<!-- Ambient Glow -->
	<div
		class="absolute -inset-2 {config.bg} rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"
	></div>

	<div
		class="relative flex items-center gap-4 px-6 py-4 bg-gray-900/40 border {config.border} rounded-2xl shadow-2xl backdrop-blur-md"
	>
		<div class="{config.color} flex-shrink-0">
			<svelte:component this={config.icon} class="w-6 h-6" />
		</div>

		<p class="text-white font-semibold text-sm flex-1 leading-tight tracking-wide">
			{message}
		</p>

		<button
			on:click={close}
			class="text-gray-500 hover:text-white transition-colors flex-shrink-0 p-1 hover:bg-white/5 rounded-lg ml-2"
		>
			<X class="w-4 h-4" />
		</button>
	</div>
</div>
