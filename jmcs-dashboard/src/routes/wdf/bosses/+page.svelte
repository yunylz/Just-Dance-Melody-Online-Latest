<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, Pencil, Trash2, Save, X, Skull } from 'lucide-svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { loadWdfConfig, saveWdfConfig } from '$lib/wdf';
	import { toast } from '$lib/toast';
	import { refreshTrigger } from '$lib/jmcs';

	const NAME = 'bosses';
	const SECTIONS = ['bosses', 'seasonal'] as const;

	let bosses: Record<string, any> = $state({});
	let seasonal: Record<string, any> = $state({});
	let activeSection = $state<'bosses' | 'seasonal'>('bosses');
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');

	let showModal = $state(false);
	let editingKey = $state('');
	let form = $state<any>({});

	const currentMap = $derived(activeSection === 'bosses' ? bosses : seasonal);
	const list = $derived(Object.entries(currentMap));

	async function load() {
		try {
			loading = true;
			error = '';
			const data = await loadWdfConfig(NAME);
			bosses = data.bosses || {};
			seasonal = data.seasonal || {};
		} catch (e: any) {
			error = e.message || 'Failed to load bosses.';
		} finally {
			loading = false;
		}
	}

	onMount(load);
	$effect(() => {
		if ($refreshTrigger) load();
	});

	function openCreate() {
		editingKey = '';
		form = {
			__class: 'OnlineBoss',
			bossId: '',
			logo: '',
			newsFeedPictureUrl: '',
			packages: { bossContent: '' },
			config: { bossDifficulty: 1, playlistLength: 1 }
		};
		showModal = true;
	}

	function openEdit(key: string) {
		editingKey = key;
		form = JSON.parse(JSON.stringify(currentMap[key]));
		if (!form.packages) form.packages = { bossContent: '' };
		if (!form.config) form.config = { bossDifficulty: 1, playlistLength: 1 };
		showModal = true;
	}

	async function save() {
		if (!form.bossId) {
			toast.error('bossId is required.');
			return;
		}
		saving = true;
		try {
			const next = { ...currentMap };
			next[form.bossId] = form;
			if (activeSection === 'bosses') bosses = next;
			else seasonal = next;

			await saveWdfConfig(NAME, { bosses, seasonal });
			showModal = false;
			toast.success('Bosses saved.');
		} catch (e: any) {
			toast.error(e.message || 'Save failed.');
		} finally {
			saving = false;
		}
	}

	async function remove(key: string) {
		if (!confirm(`Delete boss "${key}"?`)) return;
		try {
			const next = { ...currentMap };
			delete next[key];
			if (activeSection === 'bosses') bosses = next;
			else seasonal = next;

			await saveWdfConfig(NAME, { bosses, seasonal });
			toast.success('Boss deleted.');
		} catch (e: any) {
			toast.error(e.message || 'Delete failed.');
		}
	}
</script>

<PageHeader title="WDF Bosses" description="Manage World Dance Floor bosses & seasonal bosses." icon={Skull}>
	<button onclick={openCreate} class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
		<Plus class="w-4 h-4" /> Add Boss
	</button>
</PageHeader>

<div class="flex gap-2 mb-4">
	{#each SECTIONS as section}
		<button
			onclick={() => (activeSection = section)}
			class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === section ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
		>
			{section === 'bosses' ? 'Bosses' : 'Seasonal'}
		</button>
	{/each}
</div>

{#if error}<p class="text-red-400 text-sm mb-4">{error}</p>{/if}

<div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
	{#if loading}
		<div class="p-10 text-center text-slate-500">Loading…</div>
	{:else if list.length === 0}
		<div class="p-10 text-center text-slate-500">No bosses in this section yet.</div>
	{:else}
		<table class="w-full text-sm">
			<thead class="bg-slate-800/60 text-left text-slate-400">
				<tr>
					<th class="px-4 py-3">Boss</th>
					<th class="px-4 py-3">Difficulty</th>
					<th class="px-4 py-3">Playlist Length</th>
					<th class="px-4 py-3">Content</th>
					<th class="px-4 py-3 text-right">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-800">
				{#each list as [key, boss]}
					<tr class="hover:bg-slate-800/40">
						<td class="px-4 py-3 font-medium text-white">{key}</td>
						<td class="px-4 py-3 text-slate-300">{boss.config?.bossDifficulty ?? '—'}</td>
						<td class="px-4 py-3 text-slate-300">{boss.config?.playlistLength ?? '—'}</td>
						<td class="px-4 py-3 text-slate-400">{boss.packages?.bossContent ?? '—'}</td>
						<td class="px-4 py-3 text-right space-x-2">
							<button onclick={() => openEdit(key)} class="p-1.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800"><Pencil class="w-4 h-4" /></button>
							<button onclick={() => remove(key)} class="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800"><Trash2 class="w-4 h-4" /></button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

{#if showModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
			<div class="flex items-center justify-between p-4 border-b border-slate-800">
				<h3 class="text-lg font-semibold text-white">{editingKey ? `Edit ${editingKey}` : 'Add Boss'}</h3>
				<button onclick={() => (showModal = false)} class="text-slate-400 hover:text-white"><X class="w-5 h-5" /></button>
			</div>
			<div class="p-6 overflow-y-auto space-y-4">
				<div>
					<label class="block text-sm font-medium text-slate-300 mb-1">Boss ID</label>
					<input bind:value={form.bossId} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" placeholder="BOOMBOX" />
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-300 mb-1">Logo URL</label>
					<input bind:value={form.logo} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-300 mb-1">News Feed Picture URL</label>
					<input bind:value={form.newsFeedPictureUrl} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-300 mb-1">Boss Content Package</label>
					<input bind:value={form.packages.bossContent} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" placeholder="BOOMBOX_bossContent" />
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-slate-300 mb-1">Boss Difficulty</label>
						<input type="number" bind:value={form.config.bossDifficulty} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-300 mb-1">Playlist Length</label>
						<input type="number" bind:value={form.config.playlistLength} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
					</div>
				</div>
			</div>
			<div class="flex justify-end gap-3 p-4 border-t border-slate-800">
				<button onclick={() => (showModal = false)} class="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
				<button onclick={save} disabled={saving} class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
					<Save class="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
				</button>
			</div>
		</div>
	</div>
{/if}
