<script lang="ts">
	import { fetchApi } from '$lib/api';
	import { onMount } from 'svelte';
	import { Plus, Trash2, Search, Send } from 'lucide-svelte';

	interface Action {
		type: string;
		titleId?: number;
		title?: string;
		filters?: any[];
		[key: string]: any;
	}

	const COMMON_ACTION_TYPES = [
		'play', 'coop', 'upsell', 'rival', 'upsell-coop',
		'share-autodance-jdtv', 'share-autodance-jdtv-facebook',
		'share-autodance-facebook', 'quest', 'playlist'
	];

	let lists: any[] = $state([]);
	let loading = $state(true);
	let selectedList: any = $state(null);
	let isDirty = $state(false);
	let saving = $state(false);
	let publishing = $state(false);
	let showNewModal = $state(false);
	let newListName = $state('');
	let searchQuery = $state('');

	let filteredLists = $derived(searchQuery
		? lists.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()))
		: lists
	);

	onMount(load);

	async function load() {
		loading = true;
		const res = await fetchApi<{ items: any[] }>('manage-carousel/listActionLists');
		lists = res.items || [];
		loading = false;
	}

	function selectList(list: any) {
		if (isDirty && !confirm('Discard unsaved changes?')) return;
		selectedList = JSON.parse(JSON.stringify(list));
		isDirty = false;
	}

	function markDirty() { isDirty = true; }

	function addAction(type: string) {
		if (!selectedList) return;
		if (!selectedList.actions) selectedList.actions = [];
		selectedList.actions.push({ 
			__class: 'Action',
			type,
			bannerTheme: 'DEFAULT',
			bannerContext: 'family_rival',
			filters: true
		});
		markDirty();
	}

	function removeAction(idx: number) {
		if (!selectedList) return;
		selectedList.actions.splice(idx, 1);
		markDirty();
	}

	async function save() {
		if (!selectedList) return;
		saving = true;
		try {
			await fetchApi(`manage-carousel/updateActionList/${selectedList.name}`, {
				method: 'PUT',
				body: JSON.stringify(selectedList)
			});
			isDirty = false;
			await load();
		} catch (e: any) { alert('Save failed: ' + e.message); }
		finally { saving = false; }
	}

	async function createList() {
		const name = newListName.trim();
		if (!name) return;
		await fetchApi('manage-carousel/updateActionList/' + name, {
			method: 'PUT',
			body: JSON.stringify({ name, actions: [] })
		});
		showNewModal = false; newListName = '';
		await load();
	}

	async function deleteList(name: string) {
		if (!confirm(`Delete action list "${name}"?`)) return;
		await fetchApi(`manage-carousel/deleteActionList/${name}`, { method: 'DELETE' });
		if (selectedList?.name === name) selectedList = null;
		await load();
	}

	async function publish() {
		publishing = true;
		try {
			await fetchApi('manage-carousel/publish', { method: 'POST' });
			alert('Published to Redis!');
		} catch (e: any) { alert('Publish failed: ' + e.message); }
		finally { publishing = false; }
	}

	const actionColors: Record<string, string> = {
		play: 'bg-green-500/20 text-green-400',
		coop: 'bg-blue-500/20 text-blue-400',
		upsell: 'bg-yellow-500/20 text-yellow-400',
		rival: 'bg-red-500/20 text-red-400',
		quest: 'bg-purple-500/20 text-purple-400',
	};

	function updateFilters(action: any, val: string) {
		try {
			action.filters = JSON.parse(val);
			markDirty();
		} catch (e) {
			// ignore invalid json while typing
		}
	}
</script>

<div class="flex h-[calc(100vh-4rem)] -m-6">
	<!-- Left panel -->
	<aside class="w-64 border-r border-slate-800 flex flex-col bg-slate-900/50 flex-shrink-0">
		<div class="p-4 border-b border-slate-800 flex items-center justify-between">
			<h2 class="font-semibold text-white text-sm">Action Lists</h2>
			<button onclick={() => showNewModal = true} class="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"><Plus class="w-4 h-4" /></button>
		</div>
		<div class="p-3 border-b border-slate-800">
			<div class="flex items-center gap-2 bg-slate-800 rounded-md px-2.5 py-1.5 border border-slate-700">
				<Search class="w-3.5 h-3.5 text-slate-500" />
				<input bind:value={searchQuery} type="text" placeholder="Filter..." class="bg-transparent text-xs text-white outline-none flex-1 placeholder-slate-500" />
			</div>
		</div>
		<div class="flex-1 overflow-y-auto">
			{#if loading}
				<div class="p-3 space-y-2">{#each Array(5) as _}<div class="h-8 bg-slate-800 animate-pulse rounded"></div>{/each}</div>
			{:else}
				{#each filteredLists as list (list.name)}
					<div class="flex items-center group">
						<button onclick={() => selectList(list)}
							class="flex-1 text-left px-4 py-2.5 text-sm transition-colors {selectedList?.name === list.name ? 'bg-indigo-600/20 text-indigo-400 border-r-2 border-indigo-500' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">
							<div class="font-medium">{list.name}</div>
							<div class="text-xs text-slate-500 mt-0.5">{list.actions?.length || 0} actions</div>
						</button>
						<button onclick={() => deleteList(list.name)} class="mr-2 p-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all">
							<Trash2 class="w-3.5 h-3.5" />
						</button>
					</div>
				{/each}
			{/if}
		</div>
		<div class="p-3 border-t border-slate-800">
			<button onclick={publish} disabled={publishing} class="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
				<Send class="w-4 h-4" /> {publishing ? 'Publishing...' : 'Publish to Live'}
			</button>
		</div>
	</aside>

	<!-- Right: editor -->
	<main class="flex-1 overflow-y-auto p-6">
		{#if !selectedList}
			<div class="h-full flex flex-col items-center justify-center text-slate-500">
				<p class="font-medium text-white mb-1">Select an Action List</p>
				<p class="text-sm">Click a list on the left to edit its actions.</p>
			</div>
		{:else}
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-xl font-bold text-white">{selectedList.name}</h2>
				<div class="flex items-center gap-2">
					{#if isDirty}<span class="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-1 rounded-full">Unsaved</span>{/if}
					<button onclick={save} disabled={saving || !isDirty} class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
						{saving ? 'Saving...' : 'Save'}
					</button>
				</div>
			</div>

			<!-- Quick add buttons -->
			<div class="mb-4 flex gap-2 flex-wrap">
				{#each COMMON_ACTION_TYPES as type}
					<button onclick={() => addAction(type)}
						class="text-xs px-3 py-1.5 rounded-full border border-dashed border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white transition-colors">
						+ {type}
					</button>
				{/each}
			</div>

			<!-- Actions list -->
			<div class="space-y-2">
				{#each (selectedList.actions || []) as action, idx (idx)}
					<div class="border border-slate-700 rounded-xl p-4 bg-slate-900/60">
						<div class="flex items-start gap-3">
							<span class="text-xs px-2 py-0.5 rounded-full font-medium {actionColors[action.type] || 'bg-slate-700 text-slate-300'}">
								{action.type}
							</span>
							<div class="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
								<div class="space-y-0.5">
									<label class="text-[10px] uppercase font-bold text-slate-500">Type</label>
									<input type="text" value={action.type} oninput={(e: any) => { action.type = e.currentTarget.value; markDirty(); }}
										class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono focus:border-indigo-500 outline-none" />
								</div>
								<div class="space-y-0.5">
									<label class="text-[10px] uppercase font-bold text-slate-500">Title</label>
									<input type="text" value={action.title || ''} oninput={(e: any) => { action.title = e.currentTarget.value; markDirty(); }}
										class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-indigo-500 outline-none" placeholder="e.g. Play" />
								</div>
								<div class="space-y-0.5">
									<label class="text-[10px] uppercase font-bold text-slate-500">Title ID</label>
									<input type="number" value={action.titleId || ''} oninput={(e: any) => { action.titleId = e.currentTarget.value ? Number(e.currentTarget.value) : undefined; markDirty(); }}
										class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-indigo-500 outline-none" placeholder="1234" />
								</div>
								<div class="space-y-0.5">
									<label class="text-[10px] uppercase font-bold text-slate-500">Banner Type</label>
									<input type="text" value={action.bannerType || ''} oninput={(e: any) => { action.bannerType = e.currentTarget.value; markDirty(); }}
										class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-indigo-500 outline-none" placeholder="song" />
								</div>
								<div class="space-y-0.5">
									<label class="text-[10px] uppercase font-bold text-slate-500">Banner Theme</label>
									<input type="text" value={action.bannerTheme || ''} oninput={(e: any) => { action.bannerTheme = e.currentTarget.value; markDirty(); }}
										class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-indigo-500 outline-none" placeholder="DEFAULT" />
								</div>
								<div class="space-y-0.5">
									<label class="text-[10px] uppercase font-bold text-slate-500">Banner Context</label>
									<input type="text" value={action.bannerContext || ''} oninput={(e: any) => { action.bannerContext = e.currentTarget.value; markDirty(); }}
										class="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-indigo-500 outline-none" placeholder="family_rival" />
								</div>
								<div class="space-y-0.5 col-span-2 md:col-span-3 lg:col-span-5">
									<label class="text-[10px] uppercase font-bold text-slate-500">Filters (JSON)</label>
									<textarea value={JSON.stringify(action.filters, null, 2)} 
										oninput={(e: any) => updateFilters(action, e.currentTarget.value)}
										class="w-full bg-slate-800/50 border border-slate-700 rounded px-2 py-1.5 text-[11px] text-slate-300 font-mono focus:border-indigo-500 outline-none min-h-[60px]" 
										placeholder={"true or [[ { ... } ]]"}></textarea>
								</div>
							</div>
							<button onclick={() => removeAction(idx)} class="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors self-start">
								<Trash2 class="w-4 h-4" />
							</button>
						</div>
					</div>
				{:else}
					<div class="border border-dashed border-slate-700 rounded-xl p-8 text-center text-slate-500">
						<p class="text-sm">No actions yet. Click a type above to add one.</p>
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>

{#if showNewModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
		<div class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm p-6">
			<h3 class="text-lg font-bold text-white mb-4">Create Action List</h3>
			<input type="text" bind:value={newListName} placeholder="e.g. upsell_coop"
				class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white font-mono text-sm focus:border-indigo-500 outline-none mb-5" />
			<div class="flex justify-end gap-3">
				<button onclick={() => { showNewModal = false; newListName = ''; }} class="px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
				<button onclick={createList} class="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">Create</button>
			</div>
		</div>
	</div>
{/if}
