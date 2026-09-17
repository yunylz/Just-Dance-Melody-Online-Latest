<script lang="ts">
	import { fetchApi } from '$lib/api';
	import { onMount } from 'svelte';
	import { Search, Plus, Edit2, Trash2, Globe, RefreshCw, ChevronLeft, ChevronRight, Copy } from 'lucide-svelte';
	import { refreshTrigger } from '$lib/jmcs';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let items: any[] = $state([]);
	let languages: string[] = $state([]);
	let loading = $state(true);
	let isStale = $state(false);
	let total = $state(0);
	let errorMessage = $state('');
	let searchQuery = $state('');
	let showModal = $state(false);
	let current: any = $state(null);
	let saving = $state(false);
	let currentPage = $state(1);
	const perPage = 50;

	async function load(quiet = false) {
		try {
			if (!quiet) loading = true;
			isStale = true;
			errorMessage = '';
			
			const res = await fetchApi<{ items: any[], total: number }>(
				`manage-locs/list?page=${currentPage}&limit=${perPage}&search=${encodeURIComponent(searchQuery)}`
			);
			items = res.items || [];
			total = res.total || 0;
		} catch (e: any) {
			errorMessage = e.message || 'Failed to load localizations.';
		} finally {
			loading = false;
			isStale = false;
		}
	}

	async function fetchLanguages() {
		try {
			languages = await fetchApi<string[]>('/status/v1/languages');
		} catch (e) {
			console.error('Failed to fetch languages:', e);
			languages = ['en']; // Fallback
		}
	}

	onMount(async () => {
		await Promise.all([load(), fetchLanguages()]);
	});

	$effect(() => {
		if ($refreshTrigger) load();
	});

	// Pagination/Search trigger
	let debounceTimeout: any;
	let lastQuery = searchQuery;

	$effect(() => {
		// Detect search query change to reset page
		if (searchQuery !== lastQuery) {
			lastQuery = searchQuery;
			currentPage = 1;
		}
	});

	$effect(() => {
		// Track dependencies
		const _q = searchQuery;
		const _p = currentPage;
		
		clearTimeout(debounceTimeout);
		debounceTimeout = setTimeout(() => {
			load(true);
		}, 300);
	});

	function openEdit(item: any) {
		current = item ? JSON.parse(JSON.stringify(item)) : { locId: '', strings: {} };
		// Ensure all languages exist in strings
		languages.forEach(lang => {
			if (!current.strings[lang]) current.strings[lang] = '';
		});
		showModal = true;
	}

	function closeModal() { showModal = false; current = null; }

	async function save() {
		if (!current) return;
		saving = true;
		try {
			const isUpdate = items.some(i => i.locId === current.locId);
			const url = isUpdate ? `manage-locs/update/${current.locId}` : 'manage-locs/create';
			await fetchApi(url, { method: isUpdate ? 'PUT' : 'POST', body: JSON.stringify(current) });
			await load(); closeModal();
		} catch(e: any) { alert('Save failed: ' + e.message); }
		finally { saving = false; }
	}

	async function deleteItem(locId: string) {
		if (!confirm(`Delete loc ${locId}?`)) return;
		await fetchApi(`manage-locs/delete/${locId}`, { method: 'DELETE' });
		await load();
	}

	function copyEnToAll() {
		if (!current || !current.strings?.en) return;
		const enText = current.strings.en;
		languages.forEach(lang => {
			if (lang !== 'en') current.strings[lang] = enText;
		});
	}

	let maxPage = $derived(Math.max(1, Math.ceil(total / perPage)));
</script>

<PageHeader
	title="Localizations"
	description="Manage game text across {languages.length} supported languages ({total} records)."
	icon={Globe}
>
	{#snippet children()}
		<div
			class="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-2 w-80 focus-within:border-indigo-500/50 transition-all backdrop-blur-md"
		>
			<Search class="w-4 h-4 text-slate-500" />
			<input
				bind:value={searchQuery}
				type="text"
				placeholder="Search by ID or text..."
				class="bg-transparent text-sm text-white outline-none w-full placeholder-slate-600"
			/>
		</div>
	{/snippet}

	{#snippet actions()}
		<button
			onclick={() => openEdit(null)}
			class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
		>
			<Plus class="w-4 h-4" /> Add Loc
		</button>
	{/snippet}
</PageHeader>

<div class="space-y-4">

	{#if loading}
		<div class="space-y-2">{#each Array(8) as _}<div class="h-14 bg-slate-800 animate-pulse rounded-lg"></div>{/each}</div>
	{:else if errorMessage}
		<div class="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center my-8">
			<h3 class="text-white font-semibold mb-1">Connection Error</h3>
			<p class="text-slate-400 text-sm mb-4">{errorMessage}</p>
			<button onclick={() => load()} class="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Try Again</button>
		</div>
	{:else}
		<div class="border border-slate-800 rounded-lg overflow-hidden relative bg-slate-900/30">
			{#if isStale}
				<div class="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] z-10 flex items-center justify-center">
					<RefreshCw class="w-6 h-6 text-indigo-500 animate-spin" />
				</div>
			{/if}

			<table class="w-full text-sm {isStale ? 'opacity-50' : ''}">
				<thead class="bg-slate-800 border-b border-slate-700">
					<tr>
						<th class="p-3 text-left text-slate-300 font-medium w-24">Loc ID</th>
						<th class="p-3 text-left text-slate-300 font-medium">Preview (EN)</th>
						<th class="p-3 text-left text-slate-300 font-medium">Langs</th>
						<th class="p-3 text-right text-slate-300 font-medium">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-800/50">
					{#each items as item (item.locId)}
						<tr class="hover:bg-slate-800/40 transition-colors">
							<td class="p-3 font-mono text-indigo-400 text-xs font-bold">{item.locId}</td>
							<td class="p-3 text-slate-200 max-w-md truncate">{item.strings?.en || '-'}</td>
							<td class="p-3 text-slate-500 text-xs">{Object.keys(item.strings || {}).length} languages</td>
							<td class="p-3 text-right">
								<div class="flex items-center justify-end gap-1">
									<button onclick={() => openEdit(item)} class="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-md transition-colors"><Edit2 class="w-4 h-4" /></button>
									<button onclick={() => deleteItem(item.locId)} class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"><Trash2 class="w-4 h-4" /></button>
								</div>
							</td>
						</tr>
					{:else}
						<tr><td colspan="4" class="p-8 text-center text-slate-500">No localizations found.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="flex items-center justify-between px-1 text-sm text-slate-400">
			<span>Page {currentPage} of {maxPage} ({total} items total)</span>
			<div class="flex gap-2">
				<button disabled={currentPage === 1} onclick={() => currentPage--} class="px-3 py-1 bg-slate-800 border border-slate-700 rounded-md disabled:opacity-40 transition-colors hover:bg-slate-700"><ChevronLeft class="w-4 h-4" /></button>
				<button disabled={currentPage === maxPage} onclick={() => currentPage++} class="px-3 py-1 bg-slate-800 border border-slate-700 rounded-md disabled:opacity-40 transition-colors hover:bg-slate-700"><ChevronRight class="w-4 h-4" /></button>
			</div>
		</div>
	{/if}
</div>

{#if showModal && current}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
			<div class="flex items-center justify-between p-5 border-b border-slate-800">
				<div>
					<h3 class="text-lg font-semibold text-white">{current.locId ? `Edit Localization` : 'Create Localization'}</h3>
					{#if current.locId}<p class="text-xs text-slate-500 font-mono">ID: {current.locId}</p>{/if}
				</div>
				<button onclick={closeModal} class="text-slate-400 hover:text-white text-xl font-bold">×</button>
			</div>
			
			<div class="p-5 overflow-y-auto flex-1 space-y-6">
				{#if !current.locId || !items.some(i => i.locId === current.locId)}
					<div class="space-y-1.5">
						<label class="text-xs font-medium text-slate-400 uppercase tracking-wider">Loc ID</label>
						<input type="number" bind:value={current.locId}
							class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
					</div>
				{/if}

				<div class="flex items-center justify-between border-b border-slate-800 pb-2">
					<h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest">Translations</h4>
					<button 
						onclick={copyEnToAll}
						disabled={!current.strings?.en}
						class="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-30 uppercase tracking-wider"
					>
						<Copy class="w-3 h-3" /> Copy EN to All
					</button>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each languages as lang}
						<div class="space-y-1.5">
							<div class="flex items-center justify-between">
								<label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{lang}</label>
								{#if lang === 'en'}<span class="text-[9px] bg-indigo-500/20 text-indigo-400 px-1 rounded">PRIMARY</span>{/if}
							</div>
							<textarea 
								bind:value={current.strings[lang]}
								rows="2"
								class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none resize-none"
								placeholder="Enter translation..."
							></textarea>
						</div>
					{/each}
				</div>
			</div>

			<div class="p-5 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
				<button onclick={closeModal} class="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors">Cancel</button>
				<button onclick={save} disabled={saving || !current.locId} class="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50">
					{saving ? 'Saving…' : 'Save Localization'}
				</button>
			</div>
		</div>
	</div>
{/if}
