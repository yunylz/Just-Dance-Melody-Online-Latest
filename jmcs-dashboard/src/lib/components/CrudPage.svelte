<script lang="ts">
	import { fetchApi } from "$lib/api";
	import { onMount } from "svelte";
	import { Edit2, Trash2, Search, Plus, RefreshCw, Layout } from "lucide-svelte";
	import { refreshTrigger } from "$lib/jmcs";
	import PageHeader from "./PageHeader.svelte";

	interface Props {
		section: string;
		title?: string;
		description?: string;
		icon?: any;
		endpoint: string;
		idField: string;
		listFields: string[];
		editFields: string[];
		enumFields?: Record<string, Record<string, any>>;
	}

	let {
		section,
		title,
		description,
		icon,
		endpoint,
		idField,
		listFields,
		editFields,
		enumFields = {},
	}: Props = $props();

	let items: any[] = $state([]);
	let loading = $state(true);
	let isStale = $state(false); // New: indicator for background loading
	let total = $state(0);
	let errorMessage = $state("");
	let showModal = $state(false);
	let current: any = $state(null);
	let saving = $state(false);
	let searchQuery = $state("");
	let currentPage = $state(1);
	const perPage = 50;

	async function load(quiet = false) {
		try {
			if (!quiet) loading = true;
			isStale = true;
			errorMessage = "";

			const res = await fetchApi<{ items: any[]; total: number }>(
				`${endpoint}/list?page=${currentPage}&limit=${perPage}&search=${encodeURIComponent(searchQuery)}`,
			);
			items = res.items || [];
			total = res.total || 0;
		} catch (e: any) {
			errorMessage =
				e.message || "Failed to load data from this environment.";
			console.error(`[CrudPage] Error loading ${section}:`, e);
		} finally {
			loading = false;
			isStale = false;
		}
	}

	onMount(load);

	$effect(() => {
		if ($refreshTrigger) load();
	});

	// Single source of truth for loading triggers
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

	let maxPage = $derived(Math.max(1, Math.ceil(total / perPage)));

	let filtered = $derived(
		searchQuery
			? items.filter((i) =>
					listFields.some((f) =>
						String(i[f] || "")
							.toLowerCase()
							.includes(searchQuery.toLowerCase()),
					),
				)
			: items,
	);

	function openEdit(item: any) {
		current = item ? JSON.parse(JSON.stringify(item)) : {};
		showModal = true;
	}
	function closeModal() {
		showModal = false;
		current = null;
	}

	async function save() {
		if (!current) return;
		saving = true;
		try {
			const isUpdate =
				!!current[idField] &&
				items.some((i) => i[idField] === current[idField]);
			const url = isUpdate
				? `${endpoint}/update/${current[idField]}`
				: `${endpoint}/create`;
			await fetchApi(url, {
				method: isUpdate ? "PUT" : "POST",
				body: JSON.stringify(current),
			});
			await load();
			closeModal();
		} catch (e: any) {
			alert("Save failed: " + e.message);
		} finally {
			saving = false;
		}
	}

	async function deleteItem(id: string) {
		if (!confirm(`Delete ${id}?`)) return;
		await fetchApi(`${endpoint}/delete/${id}`, { method: "DELETE" });
		await load();
	}
</script>

<PageHeader 
	title={title || section} 
	description={description || `Manage ${section.toLowerCase()} records.`} 
	icon={icon}
>
	{#snippet children()}
		<div class="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-2 w-72 focus-within:border-indigo-500/50 transition-all backdrop-blur-md">
			<Search class="w-4 h-4 text-slate-500" />
			<input
				bind:value={searchQuery}
				type="text"
				placeholder="Search..."
				class="bg-transparent text-sm text-white outline-none w-full placeholder-slate-600"
			/>
		</div>
	{/snippet}

	{#snippet actions()}
		<button
			onclick={() => openEdit(null)}
			class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
		>
			<Plus class="w-4 h-4" /> Create {section}
		</button>
	{/snippet}
</PageHeader>

<div class="space-y-4">

	{#if loading}
		<div class="space-y-2">
			{#each Array(5) as _}<div
					class="h-12 bg-slate-800 animate-pulse rounded-lg"
				></div>{/each}
		</div>
	{:else if errorMessage}
		<div
			class="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center"
		>
			<div
				class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 text-red-500 mb-4"
			>
				<Trash2 class="w-6 h-6" />
			</div>
			<h3 class="text-white font-semibold mb-1">Connection Error</h3>
			<p class="text-slate-400 text-sm mb-4">{errorMessage}</p>
			<button
				onclick={load}
				class="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
			>
				Try Again
			</button>
		</div>
	{:else}
		<div
			class="border border-slate-800 rounded-lg overflow-hidden relative"
		>
			{#if isStale}
				<div
					class="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] z-10 flex items-center justify-center"
				>
					<RefreshCw class="w-6 h-6 text-indigo-500 animate-spin" />
				</div>
			{/if}

			<table class="w-full text-sm {isStale ? 'opacity-50' : ''}">
				<thead class="bg-slate-800 border-b border-slate-700">
					<tr>
						{#each listFields as f}<th
								class="p-3 text-left text-slate-300 font-medium"
								>{f}</th
							>{/each}
						<th class="p-3 text-right text-slate-300 font-medium"
							>Actions</th
						>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-800/50">
					{#each items as item (item[idField] || item._id)}
						<tr class="hover:bg-slate-800/40 transition-colors">
							{#each listFields as f}
								<td class="p-3 text-slate-300">
									{#if f === "url"}
										{#if item.url}<img
												src={item.url}
												class="w-10 h-10 object-cover rounded-md"
												alt=""
											/>{:else}-{/if}
									{:else if section === "Border" && f === "Preview"}
										<div
											class="relative w-16 h-16 bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden shadow-inner flex items-center justify-center group/preview"
										>
											{#if item.backgroundUrl}
												<img
													src={item.backgroundUrl}
													class="absolute inset-0 w-full h-full object-contain p-1"
													alt=""
												/>
											{/if}
											{#if item.foregroundUrl}
												<img
													src={item.foregroundUrl}
													class="absolute inset-0 w-full h-full object-contain z-10 p-1 group-hover/preview:scale-110 transition-transform duration-300"
													alt=""
												/>
											{/if}
										</div>
									{:else if Array.isArray(item[f])}
										<span
											class="text-xs bg-slate-800 px-2 py-1 rounded-full"
											>{item[f].length}</span
										>
									{:else}
										{item[f] !== undefined
											? String(item[f])
											: "-"}
									{/if}
								</td>
							{/each}
							<td class="p-3 text-right">
								<div
									class="flex items-center justify-end gap-1"
								>
									<button
										onclick={() => openEdit(item)}
										class="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-md transition-colors"
										><Edit2 class="w-4 h-4" /></button
									>
									<button
										onclick={() =>
											deleteItem(item[idField])}
										class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
										><Trash2 class="w-4 h-4" /></button
									>
								</div>
							</td>
						</tr>
					{:else}
						<tr
							><td
								colspan={listFields.length + 1}
								class="p-8 text-center text-slate-500"
								>No items found.</td
							></tr
						>
					{/each}
				</tbody>
			</table>
		</div>

		<div
			class="flex items-center justify-between px-1 text-sm text-slate-400 mt-4"
		>
			<span>Page {currentPage} of {maxPage} ({total} items total)</span>
			<div class="flex gap-2">
				<button
					disabled={currentPage === 1}
					onclick={() => currentPage--}
					class="px-3 py-1 bg-slate-800 border border-slate-700 rounded-md disabled:opacity-40 transition-colors hover:bg-slate-700"
					>Prev</button
				>
				<button
					disabled={currentPage === maxPage}
					onclick={() => currentPage++}
					class="px-3 py-1 bg-slate-800 border border-slate-700 rounded-md disabled:opacity-40 transition-colors hover:bg-slate-700"
					>Next</button
				>
			</div>
		</div>
	{/if}
</div>

{#if showModal && current}
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
	>
		<div
			class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col"
		>
			<div
				class="flex items-center justify-between p-5 border-b border-slate-800"
			>
				<h3 class="text-lg font-semibold text-white">
					{current[idField] ? `Edit ${section}` : `Create ${section}`}
				</h3>
				<button
					onclick={closeModal}
					class="text-slate-400 hover:text-white text-xl font-bold"
					>×</button
				>
			</div>
			<div class="p-5 overflow-y-auto flex-1 space-y-4">
				{#each editFields as field}
					<div class="space-y-1.5">
						<label
							class="text-xs font-medium text-slate-400 uppercase tracking-wider"
							>{field}</label
						>
						{#if enumFields[field]}
							<select
								value={current[field] ?? ""}
								onchange={(e) =>
									(current[field] = e.currentTarget.value)}
								class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
							>
								{#each Object.entries(enumFields[field]) as [label, val]}
									<option value={val}>{label}</option>
								{/each}
							</select>
						{:else}
							<input
								type="text"
								value={current[field] ?? ""}
								oninput={(e) =>
									(current[field] = e.currentTarget.value)}
								readonly={field === idField &&
									items.some(
										(i) => i[idField] === current[idField],
									)}
								class="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none read-only:opacity-60"
							/>
						{/if}
					</div>
				{/each}
			</div>
			<div class="p-5 border-t border-slate-800 flex justify-end gap-3">
				<button
					onclick={closeModal}
					class="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors"
					>Cancel</button
				>
				<button
					onclick={save}
					disabled={saving}
					class="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50"
					>{saving ? "Saving…" : "Save"}</button
				>
			</div>
		</div>
	</div>
{/if}
