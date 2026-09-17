<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, Pencil, Trash2, Save, X, Trophy, ListMusic } from 'lucide-svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { loadQuests, createQuest, saveQuest, deleteQuest, type Quest } from '$lib/quests';
	import { toast } from '$lib/toast';
	import { refreshTrigger } from '$lib/jmcs';

	let quests: Quest[] = $state([]);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');

	let showModal = $state(false);
	let editingId = $state('');
	let form = $state<any>({});

	function parseList(value: string): string[] {
		return [...new Set(value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))];
	}

	async function load() {
		try {
			loading = true;
			error = '';
			quests = await loadQuests();
		} catch (e: any) {
			error = e.message || 'Failed to load quests.';
		} finally {
			loading = false;
		}
	}

	onMount(load);
	$effect(() => {
		if ($refreshTrigger) load();
	});

	function openCreate() {
		editingId = '';
		form = {
			id: '',
			title: '',
			locked: 0,
			playlist: [],
			playlistText: '',
			assetUrls: { phoneImageURL: '', coverImageURL: '', logoImageURL: '' }
		};
		showModal = true;
	}

	function openEdit(q: Quest) {
		editingId = q.id;
		form = {
			...q,
			assetUrls: { ...(q.assetUrls || {}) },
			playlistText: (q.playlist || []).join('\n')
		};
		showModal = true;
	}

	async function save() {
		if (!form.id) {
			toast.error('id is required.');
			return;
		}
		if (!form.title) {
			toast.error('title is required.');
			return;
		}
		saving = true;
		try {
			const payload: Quest = {
				id: form.id,
				title: form.title,
				locked: Number(form.locked) || 0,
				playlist: parseList(form.playlistText),
				assetUrls: form.assetUrls || {}
			};
			if (editingId) {
				await saveQuest(payload);
			} else {
				await createQuest(payload);
			}
			showModal = false;
			toast.success(editingId ? 'Quest updated.' : 'Quest created.');
			await load();
		} catch (e: any) {
			toast.error(e.message || 'Save failed.');
		} finally {
			saving = false;
		}
	}

	async function remove(q: Quest) {
		if (!confirm(`Delete quest "${q.title}"?`)) return;
		try {
			await deleteQuest(q.id);
			toast.success('Quest deleted.');
			await load();
		} catch (e: any) {
			toast.error(e.message || 'Delete failed.');
		}
	}
</script>

<PageHeader title="Quests" description="Manage the online quest database (questdb)." icon={Trophy}>
	<button onclick={openCreate} class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
		<Plus class="w-4 h-4" /> Add Quest
	</button>
</PageHeader>

{#if error}<p class="text-red-400 text-sm mb-4">{error}</p>{/if}

<div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
	{#if loading}
		<div class="p-10 text-center text-slate-500">Loading…</div>
	{:else if quests.length === 0}
		<div class="p-10 text-center text-slate-500">No quests yet. Import them with <code class="text-slate-400">npx tsx tests/load-quests.ts</code></div>
	{:else}
		<table class="w-full text-sm">
			<thead class="bg-slate-800/60 text-left text-slate-400">
				<tr>
					<th class="px-4 py-3">ID</th>
					<th class="px-4 py-3">Title</th>
					<th class="px-4 py-3">Locked</th>
					<th class="px-4 py-3">Playlist</th>
					<th class="px-4 py-3 text-right">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-800">
				{#each quests as q}
					<tr class="hover:bg-slate-800/40">
						<td class="px-4 py-3 font-mono text-slate-300">{q.id}</td>
						<td class="px-4 py-3 font-medium text-white">{q.title}</td>
						<td class="px-4 py-3 text-slate-300">{q.locked ?? 0}</td>
						<td class="px-4 py-3 text-slate-400">
							<span class="flex items-center gap-1"><ListMusic class="w-3.5 h-3.5" /> {(q.playlist || []).length} songs</span>
						</td>
						<td class="px-4 py-3 text-right space-x-2">
							<button onclick={() => openEdit(q)} class="p-1.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800"><Pencil class="w-4 h-4" /></button>
							<button onclick={() => remove(q)} class="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800"><Trash2 class="w-4 h-4" /></button>
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
				<h3 class="text-lg font-semibold text-white">{editingId ? `Edit Quest ${editingId}` : 'Add Quest'}</h3>
				<button onclick={() => (showModal = false)} class="text-slate-400 hover:text-white"><X class="w-5 h-5" /></button>
			</div>
			<div class="p-6 overflow-y-auto space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-slate-300 mb-1">ID</label>
						<input bind:value={form.id} disabled={!!editingId} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none disabled:opacity-50" placeholder="7" />
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-300 mb-1">Locked</label>
						<input type="number" bind:value={form.locked} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
					</div>
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-300 mb-1">Title</label>
					<input bind:value={form.title} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" placeholder="ABBA" />
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-300 mb-1">Playlist (one map name per line)</label>
					<textarea bind:value={form.playlistText} rows="3" class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white font-mono focus:border-indigo-500 outline-none" placeholder="ABBAAsGoodAsNew&#10;ABBAIfItWasnt&#10;ABBASOS"></textarea>
				</div>
				<div class="border-t border-slate-800 pt-4">
					<label class="block text-sm font-medium text-slate-300 mb-2">Asset URLs</label>
					<div class="space-y-2">
						<input bind:value={form.assetUrls.phoneImageURL} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" placeholder="phoneImageURL" />
						<input bind:value={form.assetUrls.coverImageURL} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" placeholder="coverImageURL" />
						<input bind:value={form.assetUrls.logoImageURL} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" placeholder="logoImageURL" />
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
