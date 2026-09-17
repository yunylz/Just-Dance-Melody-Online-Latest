<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, Pencil, Trash2, Save, X, RefreshCw } from 'lucide-svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { loadWdfConfig, saveWdfConfig, fetchSkus } from '$lib/wdf';
	import { toast } from '$lib/toast';
	import { refreshTrigger } from '$lib/jmcs';

	const NAME = 'rooms';

	let rooms: any[] = $state([]);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');

	let skuOptions: string[] = $state([]);
	let skuSearch = $state('');

	let showModal = $state(false);
	let editingIndex = $state(-1);
	let form = $state<any>({});

	async function load() {
		try {
			loading = true;
			error = '';
			const data = await loadWdfConfig(NAME);
			rooms = Array.isArray(data.rooms) ? data.rooms : [];
		} catch (e: any) {
			error = e.message || 'Failed to load rooms.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		load();
		fetchSkus().then((ids) => (skuOptions = ids));
	});
	$effect(() => {
		if ($refreshTrigger) load();
	});

	function openCreate() {
		editingIndex = -1;
		form = {
			roomName: '',
			gameVersion: 'jd2018',
			enabled: false,
			skus: [],
			config: {
				lbSeasonDuration: 1209600000,
				lbFirstSeasonStartTime: null,
				themeSchedule: [],
				roomGameVersion: 'jd2018'
			}
		};
		showModal = true;
	}

	function openEdit(index: number) {
		editingIndex = index;
		form = JSON.parse(JSON.stringify(rooms[index]));
		showModal = true;
	}

	function toggleSku(sku: string) {
		if (!form.skus) form.skus = [];
		if (form.skus.includes(sku)) {
			form.skus = form.skus.filter((s: string) => s !== sku);
		} else {
			form.skus = [...form.skus, sku];
		}
	}

	async function save() {
		if (!form.roomName) {
			toast.error('roomName is required.');
			return;
		}
		saving = true;
		try {
			if (editingIndex === -1) {
				rooms = [...rooms, form];
			} else {
				const next = [...rooms];
				next[editingIndex] = form;
				rooms = next;
			}
			await saveWdfConfig(NAME, { rooms });
			showModal = false;
			toast.success('Rooms saved.');
		} catch (e: any) {
			toast.error(e.message || 'Save failed.');
		} finally {
			saving = false;
		}
	}

	async function remove(index: number) {
		if (!confirm(`Delete room "${rooms[index].roomName}"?`)) return;
		try {
			rooms = rooms.filter((_, i) => i !== index);
			await saveWdfConfig(NAME, { rooms });
			toast.success('Room deleted.');
		} catch (e: any) {
			toast.error(e.message || 'Delete failed.');
		}
	}
</script>

<PageHeader title="WDF Rooms" description="Manage World Dance Floor rooms." icon={RefreshCw}>
	<button onclick={openCreate} class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
		<Plus class="w-4 h-4" /> Add Room
	</button>
</PageHeader>

{#if error}<p class="text-red-400 text-sm mb-4">{error}</p>{/if}

<div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
	{#if loading}
		<div class="p-10 text-center text-slate-500">Loading…</div>
	{:else if rooms.length === 0}
		<div class="p-10 text-center text-slate-500">No rooms yet. Click "Add Room" to create one.</div>
	{:else}
		<table class="w-full text-sm">
			<thead class="bg-slate-800/60 text-left text-slate-400">
				<tr>
					<th class="px-4 py-3">Room</th>
					<th class="px-4 py-3">Game Version</th>
					<th class="px-4 py-3">Enabled</th>
					<th class="px-4 py-3"># SKUs</th>
					<th class="px-4 py-3 text-right">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-800">
				{#each rooms as room, i}
					<tr class="hover:bg-slate-800/40">
						<td class="px-4 py-3 font-medium text-white">{room.roomName}</td>
						<td class="px-4 py-3 text-slate-300">{room.gameVersion}</td>
						<td class="px-4 py-3">
							<span class={`px-2 py-0.5 rounded-full text-xs ${room.enabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
								{room.enabled ? 'Enabled' : 'Disabled'}
							</span>
						</td>
						<td class="px-4 py-3 text-slate-300">{(room.skus || []).length}</td>
						<td class="px-4 py-3 text-right space-x-2">
							<button onclick={() => openEdit(i)} class="p-1.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800"><Pencil class="w-4 h-4" /></button>
							<button onclick={() => remove(i)} class="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800"><Trash2 class="w-4 h-4" /></button>
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
				<h3 class="text-lg font-semibold text-white">{editingIndex === -1 ? 'Add Room' : 'Edit Room'}</h3>
				<button onclick={() => (showModal = false)} class="text-slate-400 hover:text-white"><X class="w-5 h-5" /></button>
			</div>
			<div class="p-6 overflow-y-auto space-y-4">
				<div>
					<label class="block text-sm font-medium text-slate-300 mb-1">Room Name</label>
					<input bind:value={form.roomName} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" placeholder="MainJDMO" />
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-slate-300 mb-1">Game Version</label>
						<input bind:value={form.gameVersion} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" placeholder="jd2018" />
					</div>
					<div class="flex items-end">
						<label class="flex items-center gap-2 text-sm font-medium text-slate-300 pb-2">
							<input type="checkbox" bind:checked={form.enabled} class="w-4 h-4 accent-indigo-500" />
							Enabled
						</label>
					</div>
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-300 mb-1">SKUs</label>
					<input bind:value={skuSearch} placeholder="Search SKUs…" class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white mb-2 focus:border-indigo-500 outline-none" />
					<div class="max-h-48 overflow-y-auto border border-slate-700 rounded-md bg-slate-800/40 p-2 space-y-1">
						{#each skuOptions.filter((s) => s.toLowerCase().includes(skuSearch.toLowerCase())) as sku}
							<label class="flex items-center gap-2 text-sm text-slate-300 hover:bg-slate-800 px-2 py-1 rounded cursor-pointer">
								<input type="checkbox" checked={form.skus?.includes(sku)} onchange={() => toggleSku(sku)} class="w-4 h-4 accent-indigo-500" />
								<span class="font-mono text-xs">{sku}</span>
							</label>
						{/each}
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-slate-300 mb-1">Room Game Version</label>
						<input bind:value={form.config.roomGameVersion} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" placeholder="jd2018" />
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-300 mb-1">LB Season Duration (ms)</label>
						<input type="number" bind:value={form.config.lbSeasonDuration} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
					</div>
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-300 mb-1">LB First Season Start Time (ms)</label>
					<input type="number" bind:value={form.config.lbFirstSeasonStartTime} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
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
