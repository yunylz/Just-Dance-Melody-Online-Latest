<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isTauri } from '$lib/tauri.js';

	// Tauri-only routes: block access on the web, just like admin pages are
	// blocked for non-admins.
	onMount(() => {
		if (!isTauri()) {
			goto('/hub/desktop-only');
		}
	});
</script>

<slot />
