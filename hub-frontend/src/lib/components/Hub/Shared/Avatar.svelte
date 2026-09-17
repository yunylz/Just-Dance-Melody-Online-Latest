<script>
	import { Loader2 } from 'lucide-svelte';
	import API from '$lib/api.js';

	export let avatar;
	export let username = "None";
	export let isOnline = false;
	export let size = "w-12 h-12";

	let loaded = false;
	let error = false;

	$: { avatar; loaded = false; error = false; }
</script>

<div class="relative {size} shrink-0">
	<div class="w-full h-full rounded-xl overflow-hidden border-2 border-gray-600/50 relative bg-gray-600/50">
		{#if !loaded}
			<div class="absolute inset-0 flex items-center justify-center">
				<Loader2 class="w-5 h-5 text-purple-400 animate-spin" />
			</div>
		{/if}

		{#if !error}
			<img
					src={API.getAvatarUrl(avatar)}
					alt="{username} avatar"
					class="w-full h-full object-cover transition-opacity duration-300 {loaded ? 'opacity-100' : 'opacity-0'}"
					on:load={() => loaded = true}
					on:error={() => {
						error = true;
						loaded = true;
					}}
				/>
		{:else}
			<img
				src={API.getDefaultAvatar()}
				class="w-full h-full object-cover"
			/>
		{/if}
	</div>

	{#if isOnline}
		<div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-gray-800 animate-pulse shadow-lg z-10"></div>
	{/if}
</div>