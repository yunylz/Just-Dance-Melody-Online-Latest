<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, Pencil, Trash2, Save, X, CalendarClock } from 'lucide-svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { loadWdfConfig, saveWdfConfig, parseList, toList } from '$lib/wdf';
	import { toast } from '$lib/toast';
	import { refreshTrigger } from '$lib/jmcs';

	const NAME = 'schedule';
	const THEMES = ['vote', 'map', 'boss', 'teambattle', 'tournament', 'spotlight', 'theme'];

	let entries: any[] = $state([]);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');

	let showModal = $state(false);
	let editingIndex = $state(-1);
	let form = $state<any>({});

	async function load() {
		try {
			loading = true;
			error = '';
			const data = await loadWdfConfig(NAME);
			entries = Array.isArray(data.schedule) ? data.schedule : [];
		} catch (e: any) {
			error = e.message || 'Failed to load schedule.';
		} finally {
			loading = false;
		}
	}

	onMount(load);
	$effect(() => {
		if ($refreshTrigger) load();
	});

	function openCreate() {
		editingIndex = -1;
		form = {
			type: 'probability',
			theme: 'vote',
			probability: 0,
			rooms: [],
			playlist: '',
			recurrence: { day: 1, hour: 0, minute: 0, type: 'weekly' }
		};
		showModal = true;
	}

	function openEdit(index: number) {
		editingIndex = index;
		form = JSON.parse(JSON.stringify(entries[index]));
		if (!form.recurrence) form.recurrence = { day: 1, hour: 0, minute: 0, type: 'weekly' };
		showModal = true;
	}

	function syncRooms(e: Event) {
		form.rooms = parseList((e.currentTarget as HTMLTextAreaElement).value);
	}

	async function save() {
		saving = true;
		try {
			if (form.type !== 'recurring') delete form.recurrence;
			if (editingIndex === -1) {
				entries = [...entries, form];
			} else {
				const next = [...entries];
				next[editingIndex] = form;
				entries = next;
			}
			await saveWdfConfig(NAME, { schedule: entries });
			showModal = false;
			toast.success('Schedule saved.');
		} catch (e: any) {
			toast.error(e.message || 'Save failed.');
		} finally {
			saving = false;
		}
	}

	async function remove(index: number) {
		if (!confirm(`Delete this schedule entry?`)) return;
		try {
			entries = entries.filter((_, i) => i !== index);
			await saveWdfConfig(NAME, { schedule: entries });
			toast.success('Schedule entry deleted.');
		} catch (e: any) {
			toast.error(e.message || 'Delete failed.');
		}
	}

	function describe(e: any) {
		if (e.type === 'recurring' && e.recurrence) {
			const r = e.recurrence;
			return `Recurring ${r.type} · day ${r.day} ${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`;
		}
		return `${e.probability ?? 0}%`;
	}
</script>

<PageHeader title="WDF Schedules" description="Manage World Dance Floor schedule entries." icon={CalendarClock}>
	<button onclick={openCreate} class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
		<Plus class="w-4 h-4" /> Add Entry
	</button>
</PageHeader>

{#if error}<p class="text-red-400 text-sm mb-4">{error}</p>{/if}

<div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
	{#if loading}
		<div class="p-10 text-center text-slate-500">Loading…</div>
	{:else if entries.length === 0}
		<div class="p-10 text-center text-slate-500">No schedule entries yet.</div>
	{:else}
		<table class="w-full text-sm">
			<thead class="bg-slate-800/60 text-left text-slate-400">
				<tr>
					<th class="px-4 py-3">Type</th>
					<th class="px-4 py-3">Theme</th>
					<th class="px-4 py-3">Value</th>
					<th class="px-4 py-3">Rooms</th>
					<th class="px-4 py-3 text-right">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-800">
				{#each entries as entry, i}
					<tr class="hover:bg-slate-800/40">
						<td class="px-4 py-3">
							<span class={`px-2 py-0.5 rounded-full text-xs ${entry.type === 'recurring' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-300'}`}>{entry.type}</span>
						</td>
						<td class="px-4 py-3 text-slate-300">{entry.theme}</td>
						<td class="px-4 py-3 text-slate-300">{describe(entry)}</td>
						<td class="px-4 py-3 text-slate-400">{(entry.rooms || []).join(', ')}</td>
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
				<h3 class="text-lg font-semibold text-white">{editingIndex === -1 ? 'Add Schedule Entry' : 'Edit Schedule Entry'}</h3>
				<button onclick={() => (showModal = false)} class="text-slate-400 hover:text-white"><X class="w-5 h-5" /></button>
			</div>
			<div class="p-6 overflow-y-auto space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-slate-300 mb-1">Type</label>
						<select bind:value={form.type} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none">
							<option value="recurring">recurring</option>
							<option value="probability">probability</option>
						</select>
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-300 mb-1">Theme</label>
						<input bind:value={form.theme} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" list="wdf-themes" placeholder="vote" />
						<datalist id="wdf-themes">
							{#each THEMES as t}<option value={t} />{/each}
						</datalist>
					</div>
				</div>

				{#if form.type === 'recurring'}
					<div class="border border-slate-800 rounded-lg p-4 space-y-3 bg-slate-800/30">
						<p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recurrence</p>
						<div class="grid grid-cols-4 gap-3">
							<div>
								<label class="block text-xs text-slate-400 mb-1">Type</label>
								<input bind:value={form.recurrence.type} class="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-white focus:border-indigo-500 outline-none" placeholder="weekly" />
							</div>
							<div>
								<label class="block text-xs text-slate-400 mb-1">Day</label>
								<input type="number" bind:value={form.recurrence.day} class="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-white focus:border-indigo-500 outline-none" />
							</div>
							<div>
								<label class="block text-xs text-slate-400 mb-1">Hour</label>
								<input type="number" bind:value={form.recurrence.hour} class="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-white focus:border-indigo-500 outline-none" />
							</div>
							<div>
								<label class="block text-xs text-slate-400 mb-1">Minute</label>
								<input type="number" bind:value={form.recurrence.minute} class="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-white focus:border-indigo-500 outline-none" />
							</div>
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-300 mb-1">Playlist</label>
						<input bind:value={form.playlist} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" placeholder="weekly" />
					</div>
				{:else}
					<div>
						<label class="block text-sm font-medium text-slate-300 mb-1">Probability (%)</label>
						<input type="number" bind:value={form.probability} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
					</div>
				{/if}

				<div>
					<label class="block text-sm font-medium text-slate-300 mb-1">Rooms (one per line)</label>
					<textarea value={toList(form.rooms)} oninput={syncRooms} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white h-24 font-mono focus:border-indigo-500 outline-none" />
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
