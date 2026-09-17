<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, Save, X, Trash2, Pencil, Settings2 } from 'lucide-svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { loadWdfConfig, saveWdfConfig } from '$lib/wdf';
	import { toast } from '$lib/toast';
	import { refreshTrigger } from '$lib/jmcs';

	const NAME = 'config';
	const TABS = ['banned', 'durations', 'themes', 'playlists'] as const;
	const MAP_FILTER_KEYS = ['jdVersion', 'difficulty', 'artist', 'coach', 'sweat'];

	let config: any = $state({});
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let tab = $state<(typeof TABS)[number]>('banned');

	// Banned maps
	let newMap = $state('');

	// Durations
	let defaultDurations: [string, number][] = $state([]);
	let screenDurations: [string, number][] = $state([]);
	let recapConstants = $state<Record<string, number>>({});

	// Theme configs
	let themeConfigs: Record<string, any> = $state({});
	let themeModal = $state(false);
	let themeKey = $state('');
	let themeForm = $state<any>({});

	// Playlists
	let playlists: Record<string, any> = $state({});
	let playlistModal = $state(false);
	let playlistKey = $state('');
	let playlistForm = $state<any>({});

	async function load() {
		try {
			loading = true;
			error = '';
			const data = await loadWdfConfig(NAME);
			config = data.config || data;
			themeConfigs = data.themeConfigs || {};
			playlists = data.playlists || {};

			defaultDurations = Object.entries(config.defaultDurations || {}).map(([k, v]) => [k, Number(v)]);
			screenDurations = Object.entries(config.screenDurations || {}).map(([k, v]) => [k, Number((v as any).duration)]);
			recapConstants = {
				WDF_RECAP_ADJACENT_PLAYER_COUNT: Number(config.WDF_RECAP_ADJACENT_PLAYER_COUNT) || 0,
				WDF_RECAP_TOP_PLAYERS_COUNT: Number(config.WDF_RECAP_TOP_PLAYERS_COUNT) || 0,
				WDF_RECAP_BOTTOM_PLAYERS_COUNT: Number(config.WDF_RECAP_BOTTOM_PLAYERS_COUNT) || 0
			};
		} catch (e: any) {
			error = e.message || 'Failed to load config.';
		} finally {
			loading = false;
		}
	}

	onMount(load);
	$effect(() => {
		if ($refreshTrigger) load();
	});

	// ── Banned maps ────────────────────────────────────────────
	const bannedMaps = $derived(Array.isArray(config.bannedMaps) ? config.bannedMaps : []);

	function addMap() {
		const m = newMap.trim();
		if (!m) return;
		config.bannedMaps = [...bannedMaps, m];
		newMap = '';
	}
	function removeMap(m: string) {
		config.bannedMaps = bannedMaps.filter((x: string) => x !== m);
	}

	// ── Durations ──────────────────────────────────────────────
	function addDefaultDuration() {
		defaultDurations = [...defaultDurations, ['', 0]];
	}
	function addScreenDuration() {
		screenDurations = [...screenDurations, ['', 0]];
	}

	// ── Theme configs ──────────────────────────────────────────
	function openTheme(key: string) {
		themeKey = key;
		themeForm = key ? { ...themeConfigs[key] } : { type: '', active: false };
		themeModal = true;
	}
	function saveTheme() {
		if (!themeForm.type) {
			toast.error('type is required.');
			return;
		}
		// Keep existing key when editing, else use the type name as key
		const key = themeKey || themeForm.type;
		themeConfigs = { ...themeConfigs, [key]: themeForm };
		themeModal = false;
	}
	function removeTheme(key: string) {
		if (!confirm(`Delete theme config "${key}"?`)) return;
		const next = { ...themeConfigs };
		delete next[key];
		themeConfigs = next;
	}

	// ── Playlists ──────────────────────────────────────────────
	function openPlaylist(key: string) {
		playlistKey = key;
		playlistForm = key ? JSON.parse(JSON.stringify(playlists[key])) : { type: '', tournamentLength: 3, logoUrl: '', probability: 0, mapFilters: {} };
		if (!playlistForm.mapFilters) playlistForm.mapFilters = {};
		playlistModal = true;
	}
	function savePlaylist() {
		if (!playlistForm.type) {
			toast.error('type is required.');
			return;
		}
		const key = playlistKey || playlistForm.type;
		playlists = { ...playlists, [key]: playlistForm };
		playlistModal = false;
	}
	function removePlaylist(key: string) {
		if (!confirm(`Delete playlist "${key}"?`)) return;
		const next = { ...playlists };
		delete next[key];
		playlists = next;
	}

	function setMapFilter(filterKey: string, value: string) {
		const items = value.split(',').map((s) => s.trim()).filter(Boolean);
		// Preserve numeric values as numbers, keep the rest as strings
		const parsed = items.map((s) => (/^-?\d+$/.test(s) ? Number(s) : s));
		playlistForm.mapFilters[filterKey] = parsed;
	}
	function mapFilterValue(filterKey: string) {
		return (playlistForm.mapFilters[filterKey] || []).join(', ');
	}

	async function save() {
		saving = true;
		try {
			config.defaultDurations = Object.fromEntries(defaultDurations.filter(([k]) => k.trim()));
			config.screenDurations = Object.fromEntries(screenDurations.filter(([k]) => k.trim()).map(([k, v]) => [k, { duration: v }]));
			config.WDF_RECAP_ADJACENT_PLAYER_COUNT = Number(recapConstants.WDF_RECAP_ADJACENT_PLAYER_COUNT) || 0;
			config.WDF_RECAP_TOP_PLAYERS_COUNT = Number(recapConstants.WDF_RECAP_TOP_PLAYERS_COUNT) || 0;
			config.WDF_RECAP_BOTTOM_PLAYERS_COUNT = Number(recapConstants.WDF_RECAP_BOTTOM_PLAYERS_COUNT) || 0;

			await saveWdfConfig(NAME, { config, themeConfigs, playlists });
			toast.success('WDF config saved.');
		} catch (e: any) {
			toast.error(e.message || 'Save failed.');
		} finally {
			saving = false;
		}
	}
</script>

<PageHeader title="WDF Config" description="World Dance Floor global config." icon={Settings2}>
	<button onclick={save} disabled={saving} class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
		<Save class="w-4 h-4" /> {saving ? 'Saving…' : 'Save Config'}
	</button>
</PageHeader>

{#if error}<p class="text-red-400 text-sm mb-4">{error}</p>{/if}

<div class="flex gap-2 mb-4">
	{#each TABS as t}
		<button
			onclick={() => (tab = t)}
			class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
		>
			{t === 'banned' ? 'Banned Maps' : t === 'durations' ? 'Durations' : t === 'themes' ? 'Theme Configs' : 'Playlists'}
		</button>
	{/each}
</div>

{#if loading}
	<div class="p-10 text-center text-slate-500">Loading…</div>
{:else}

{#if tab === 'banned'}
	<div class="bg-slate-900 border border-slate-800 rounded-lg p-4">
		<div class="flex gap-2 mb-4">
			<input bind:value={newMap} placeholder="Map name e.g. MJEarthSong" onkeydown={(e) => e.key === 'Enter' && addMap()} class="flex-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
			<button onclick={addMap} class="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-md text-sm"><Plus class="w-4 h-4" /> Add</button>
		</div>
		{#if bannedMaps.length === 0}
			<p class="text-slate-500 text-sm">No banned maps.</p>
		{:else}
			<div class="flex flex-wrap gap-2">
				{#each bannedMaps as m}
					<span class="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full px-3 py-1 text-sm text-slate-200">
						{m}
						<button onclick={() => removeMap(m)} class="text-slate-500 hover:text-red-400"><X class="w-3.5 h-3.5" /></button>
					</span>
				{/each}
			</div>
		{/if}
	</div>
{:else if tab === 'durations'}
	<div class="grid grid-cols-2 gap-4">
		<div class="bg-slate-900 border border-slate-800 rounded-lg p-4">
			<div class="flex items-center justify-between mb-3">
				<h3 class="text-sm font-semibold text-slate-300">Default Durations</h3>
				<button onclick={addDefaultDuration} class="p-1.5 rounded text-slate-400 hover:text-indigo-400"><Plus class="w-4 h-4" /></button>
			</div>
			<div class="space-y-2">
				{#each defaultDurations as [k, v], i}
					<div class="flex gap-2 items-center">
						<input bind:value={defaultDurations[i][0]} placeholder="key" class="flex-1 bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-white font-mono focus:border-indigo-500 outline-none" />
						<input type="number" bind:value={defaultDurations[i][1]} class="w-24 bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-white focus:border-indigo-500 outline-none" />
						<button onclick={() => (defaultDurations = defaultDurations.filter((_, j) => j !== i))} class="text-slate-500 hover:text-red-400"><Trash2 class="w-3.5 h-3.5" /></button>
					</div>
				{/each}
				{#if defaultDurations.length === 0}<p class="text-slate-500 text-xs">No default durations.</p>{/if}
			</div>

			<div class="flex items-center justify-between mt-6 mb-3">
				<h3 class="text-sm font-semibold text-slate-300">Recap Constants</h3>
			</div>
			<div class="space-y-2">
				{#each Object.keys(recapConstants) as key}
					<div class="flex gap-2 items-center">
						<span class="flex-1 text-xs text-slate-400 font-mono">{key}</span>
						<input type="number" bind:value={recapConstants[key]} class="w-24 bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-white focus:border-indigo-500 outline-none" />
					</div>
				{/each}
			</div>
		</div>

		<div class="bg-slate-900 border border-slate-800 rounded-lg p-4">
			<div class="flex items-center justify-between mb-3">
				<h3 class="text-sm font-semibold text-slate-300">Screen Durations</h3>
				<button onclick={addScreenDuration} class="p-1.5 rounded text-slate-400 hover:text-indigo-400"><Plus class="w-4 h-4" /></button>
			</div>
			<div class="space-y-2">
				{#each screenDurations as [k, v], i}
					<div class="flex gap-2 items-center">
						<input bind:value={screenDurations[i][0]} placeholder="screen key" class="flex-1 bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-white font-mono focus:border-indigo-500 outline-none" />
						<input type="number" bind:value={screenDurations[i][1]} class="w-24 bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-white focus:border-indigo-500 outline-none" />
						<button onclick={() => (screenDurations = screenDurations.filter((_, j) => j !== i))} class="text-slate-500 hover:text-red-400"><Trash2 class="w-3.5 h-3.5" /></button>
					</div>
				{/each}
				{#if screenDurations.length === 0}<p class="text-slate-500 text-xs">No screen durations.</p>{/if}
			</div>
		</div>
	</div>
{:else if tab === 'themes'}
	<div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
		<div class="flex justify-end p-3">
			<button onclick={() => openTheme('')} class="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-md text-sm"><Plus class="w-4 h-4" /> Add Theme</button>
		</div>
		<table class="w-full text-sm">
			<thead class="bg-slate-800/60 text-left text-slate-400">
				<tr><th class="px-4 py-3">Key</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Active</th><th class="px-4 py-3 text-right">Actions</th></tr>
			</thead>
			<tbody class="divide-y divide-slate-800">
				{#each Object.entries(themeConfigs) as [key, tc]}
					<tr class="hover:bg-slate-800/40">
						<td class="px-4 py-3 font-medium text-white">{key}</td>
						<td class="px-4 py-3 text-slate-300">{tc.type}</td>
						<td class="px-4 py-3 text-slate-400">{tc.active ? 'Yes' : '—'}</td>
						<td class="px-4 py-3 text-right space-x-2">
							<button onclick={() => openTheme(key)} class="p-1.5 rounded text-slate-400 hover:text-indigo-400"><Pencil class="w-4 h-4" /></button>
							<button onclick={() => removeTheme(key)} class="p-1.5 rounded text-slate-400 hover:text-red-400"><Trash2 class="w-4 h-4" /></button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if Object.keys(themeConfigs).length === 0}<p class="p-6 text-center text-slate-500 text-sm">No theme configs.</p>{/if}
	</div>
{:else if tab === 'playlists'}
	<div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
		<div class="flex justify-end p-3">
			<button onclick={() => openPlaylist('')} class="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-md text-sm"><Plus class="w-4 h-4" /> Add Playlist</button>
		</div>
		<table class="w-full text-sm">
			<thead class="bg-slate-800/60 text-left text-slate-400">
				<tr><th class="px-4 py-3">Key</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Tournament Length</th><th class="px-4 py-3">Probability</th><th class="px-4 py-3 text-right">Actions</th></tr>
			</thead>
			<tbody class="divide-y divide-slate-800">
				{#each Object.entries(playlists) as [key, p]}
					<tr class="hover:bg-slate-800/40">
						<td class="px-4 py-3 font-medium text-white">{key}</td>
						<td class="px-4 py-3 text-slate-300">{p.type}</td>
						<td class="px-4 py-3 text-slate-300">{p.tournamentLength ?? '—'}</td>
						<td class="px-4 py-3 text-slate-300">{p.probability ?? 0}%</td>
						<td class="px-4 py-3 text-right space-x-2">
							<button onclick={() => openPlaylist(key)} class="p-1.5 rounded text-slate-400 hover:text-indigo-400"><Pencil class="w-4 h-4" /></button>
							<button onclick={() => removePlaylist(key)} class="p-1.5 rounded text-slate-400 hover:text-red-400"><Trash2 class="w-4 h-4" /></button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if Object.keys(playlists).length === 0}<p class="p-6 text-center text-slate-500 text-sm">No playlists.</p>{/if}
	</div>
{/if}

{/if}

{#if themeModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md">
			<div class="flex items-center justify-between p-4 border-b border-slate-800">
				<h3 class="text-lg font-semibold text-white">Theme Config</h3>
				<button onclick={() => (themeModal = false)} class="text-slate-400 hover:text-white"><X class="w-5 h-5" /></button>
			</div>
			<div class="p-6 space-y-4">
				<div>
					<label class="block text-sm font-medium text-slate-300 mb-1">Type</label>
					<input bind:value={themeForm.type} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" placeholder="vote" />
				</div>
				<label class="flex items-center gap-2 text-sm font-medium text-slate-300">
					<input type="checkbox" bind:checked={themeForm.active} class="w-4 h-4 accent-indigo-500" />
					Active
				</label>
			</div>
			<div class="flex justify-end gap-3 p-4 border-t border-slate-800">
				<button onclick={() => (themeModal = false)} class="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
				<button onclick={saveTheme} class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
			</div>
		</div>
	</div>
{/if}

{#if playlistModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
			<div class="flex items-center justify-between p-4 border-b border-slate-800">
				<h3 class="text-lg font-semibold text-white">Playlist</h3>
				<button onclick={() => (playlistModal = false)} class="text-slate-400 hover:text-white"><X class="w-5 h-5" /></button>
			</div>
			<div class="p-6 overflow-y-auto space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-slate-300 mb-1">Type</label>
						<input bind:value={playlistForm.type} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" placeholder="jd2020" />
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-300 mb-1">Tournament Length</label>
						<input type="number" bind:value={playlistForm.tournamentLength} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
					</div>
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-300 mb-1">Logo URL</label>
					<input bind:value={playlistForm.logoUrl} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-300 mb-1">Probability (%)</label>
					<input type="number" bind:value={playlistForm.probability} class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-300 mb-2">Map Filters</label>
					<div class="space-y-2">
						{#each MAP_FILTER_KEYS as fk}
							<div class="flex gap-2 items-center">
								<span class="w-24 text-xs text-slate-400">{fk}</span>
								<input value={mapFilterValue(fk)} oninput={(e) => setMapFilter(fk, (e.currentTarget as HTMLInputElement).value)} placeholder="comma separated values" class="flex-1 bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-white font-mono focus:border-indigo-500 outline-none" />
							</div>
						{/each}
					</div>
				</div>
			</div>
			<div class="flex justify-end gap-3 p-4 border-t border-slate-800">
				<button onclick={() => (playlistModal = false)} class="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
				<button onclick={savePlaylist} class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
			</div>
		</div>
	</div>
{/if}
