<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Topbar from '$lib/components/Topbar.svelte';
	import ServerPanel from '$lib/components/ServerPanel.svelte';
	import Toast from '$lib/components/Toast.svelte';
	
	import { user } from '$lib/jmcs';
	
	let { children, data } = $props();
	let isServerPanelOpen = $state(false);

	// Initialize store immediately so it's available for child components
	user.set(data.user);
</script>

<div class="min-h-screen bg-bg-dark text-text-main flex">
	<Sidebar />
	<div class="flex-1 ml-64 flex flex-col min-h-screen">
		<Topbar bind:isServerPanelOpen />
		<main class="flex-1 p-6 overflow-x-hidden">
			{@render children()}
		</main>
	</div>
</div>

<ServerPanel bind:isOpen={isServerPanelOpen} />
<Toast />
