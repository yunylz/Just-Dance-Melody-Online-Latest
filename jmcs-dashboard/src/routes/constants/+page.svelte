<script lang="ts">
	import { onMount } from 'svelte';
	import { Save } from 'lucide-svelte';
	import { fetchApi } from '$lib/api';
	import { refreshTrigger } from '$lib/jmcs';

	let value = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let jsonError = $state('');

	async function load() {
		try {
			loading = true;
			const data = await fetchApi<any>('/constant-provider/v1/sku-constants');
			value = JSON.stringify(data, null, 2);
		} finally {
			loading = false;
		}
	}

	onMount(() => load());

	$effect(() => {
		if ($refreshTrigger) load();
	});

	function onChange(v: string) {
		value = v;
		try {
			JSON.parse(v);
			jsonError = '';
		} catch {
			jsonError = 'Invalid JSON';
		}
	}

	async function save() {
		if (jsonError) return;
		saving = true;
		try {
			await fetchApi('/constant-provider/v1/sku-constants', {
				method: 'POST',
				body: value
			});
			alert('Constants saved!');
		} catch (e: any) {
			alert('Save failed: ' + e.message);
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-4 h-full flex flex-col">
	<div class="flex items-center justify-between">
		<h2 class="text-xl font-semibold text-white">Constants</h2>
		<button onclick={save} disabled={saving || !!jsonError} class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
			<Save class="w-4 h-4" /> {saving ? 'Saving...' : 'Save Constants'}
		</button>
	</div>

	{#if loading}
		<div class="flex-1 bg-slate-800 animate-pulse rounded-lg"></div>
	{:else}
		{#if jsonError}<p class="text-xs text-red-400">{jsonError}</p>{/if}
		<textarea
			value={value}
			oninput={(e) => onChange(e.currentTarget.value)}
			class="flex-1 w-full min-h-[70vh] bg-slate-900 border {jsonError ? 'border-red-500' : 'border-slate-700'} rounded-lg px-4 py-3 text-sm font-mono text-slate-300 focus:border-indigo-500 outline-none resize-none"
		></textarea>
	{/if}
</div>
