<script lang="ts">
	import { fetchApi } from "$lib/api";
	import { onMount } from "svelte";
	import {
		Edit2,
		Trash2,
		Search,
		ChevronUp,
		ChevronDown,
		Plus,
	} from "lucide-svelte";

	let {
		endpoint = "",
		fields = [],
		onEdit = (item: any) => {},
		onDelete = async (id: string) => {},
		title = "",
		idField = "mapName",
	} = $props<{
		endpoint: string;
		fields: string[];
		onEdit: (item: any) => void;
		onDelete: (id: string) => Promise<void>;
		title: string;
		idField?: string;
	}>();

	let items: any[] = $state([]);
	let loading = $state(true);
	let error = $state("");

	let searchQuery = $state("");
	let sortCol = $state<string | null>(null);
	let sortDesc = $state(false);

	let currentPage = $state(1);
	const itemsPerPage = 50;

	async function loadData() {
		try {
			loading = true;
			const res = await fetchApi<{ items: any[] }>(endpoint);
			items = res.items || [];
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadData();
	});

	let filteredItems = $derived.by(() => {
		let result = [...items];
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			result = result.filter((item) =>
				fields.some((f) =>
					String(item[f] || "")
						.toLowerCase()
						.includes(q),
				),
			);
		}
		if (sortCol) {
			result.sort((a, b) => {
				let valA = a[sortCol] ?? "";
				let valB = b[sortCol] ?? "";
				if (typeof valA === "string") valA = valA.toLowerCase();
				if (typeof valB === "string") valB = valB.toLowerCase();
				if (valA < valB) return sortDesc ? 1 : -1;
				if (valA > valB) return sortDesc ? -1 : 1;
				return 0;
			});
		}
		return result;
	});

	let paginatedItems = $derived(
		filteredItems.slice(
			(currentPage - 1) * itemsPerPage,
			currentPage * itemsPerPage,
		),
	);

	let maxPage = $derived(
		Math.max(1, Math.ceil(filteredItems.length / itemsPerPage)),
	);

	$effect(() => {
		if (searchQuery) currentPage = 1;
	});

	function handleSort(field: string) {
		if (field === "Image") return;
		if (sortCol === field) {
			sortDesc = !sortDesc;
		} else {
			sortCol = field;
			sortDesc = false;
		}
	}

	function getThumbnail(item: any) {
		const url =
			item.assets?.nx?.phoneCoverImageUrl ||
			item.assets?.phoneCoverImageUrl ||
			item.url ||
			item.logoUrl;
		return url ? url : null; // In real app, add CDN base URL
	}
</script>

<div class="mb-4 flex items-center justify-between">
	<div
		class="flex items-center gap-4 bg-slate-800 rounded-md px-3 py-2 w-64 border border-slate-700"
	>
		<Search class="w-4 h-4 text-slate-400" />
		<input
			type="text"
			placeholder="Search..."
			bind:value={searchQuery}
			class="bg-transparent border-none outline-none text-sm w-full placeholder-slate-500 text-white"
		/>
	</div>
	<button
		class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2"
		onclick={() => onEdit(null)}
	>
		<Plus class="w-4 h-4" /> Create
	</button>
</div>

{#if loading}
	<div class="space-y-4">
		{#each Array(5) as _}
			<div class="h-12 bg-slate-800 animate-pulse rounded-md"></div>
		{/each}
	</div>
{:else if error}
	<div
		class="p-4 bg-red-500/20 border border-red-500 text-red-400 rounded-md"
	>
		Failed to load data: {error}
	</div>
{:else}
	<div
		class="overflow-x-auto border border-slate-800 rounded-md bg-slate-900/50"
	>
		<table class="w-full text-left border-collapse text-sm">
			<thead class="bg-slate-800 border-b border-slate-700">
				<tr>
					{#each fields as field}
						<th
							class="px-4 py-3 font-semibold text-slate-300 {field !==
							'Image'
								? 'cursor-pointer hover:bg-slate-700 select-none'
								: ''}"
							onclick={() => handleSort(field)}
						>
							<div class="flex items-center gap-1">
								{field}
								{#if sortCol === field}
									{#if sortDesc}
										<ChevronDown class="w-4 h-4" />
									{:else}
										<ChevronUp class="w-4 h-4" />
									{/if}
								{/if}
							</div>
						</th>
					{/each}
					<th
						class="px-4 py-3 font-semibold text-slate-300 text-right"
						>Actions</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-800/50">
				{#each paginatedItems as item (item[idField] || item._id || Math.random())}
					<tr class="hover:bg-slate-800/50 transition-colors">
						{#each fields as field}
							<td class="px-4 py-3 text-slate-300">
								{#if field === "Image"}
									{#if getThumbnail(item)}
										<img
											src={getThumbnail(item)}
											class="w-10 h-10 object-cover rounded-md"
											alt="Thumb"
										/>
									{:else}
										-
									{/if}
								{:else if field === "strings" && typeof item[field] === "object"}
									<span
										class="text-xs bg-slate-800 px-2 py-1 rounded-md"
										>{Object.keys(item[field] || {}).length}
										locales</span
									>
								{:else if Array.isArray(item[field])}
									<span
										class="text-xs bg-slate-800 px-2 py-1 rounded-md"
										>{item[field].length} items</span
									>
								{:else}
									{item[field] !== undefined
										? String(item[field])
										: "-"}
								{/if}
							</td>
						{/each}
						<td class="px-4 py-3 text-right">
							<div class="flex items-center justify-end gap-2">
								<button
									class="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-md transition-colors"
									onclick={() => onEdit(item)}
								>
									<Edit2 class="w-4 h-4" />
								</button>
								<button
									class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
									onclick={() => {
										if (
											confirm(
												`Delete ${item[idField] || "this item"}?`,
											)
										)
											onDelete(
												item[idField] ||
													item.name ||
													item._id,
											);
									}}
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td
							colspan={fields.length + 1}
							class="px-4 py-8 text-center text-slate-500"
						>
							No items found.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="mt-4 flex items-center justify-between px-2">
		<span class="text-sm text-slate-400">
			Page {currentPage} of {maxPage} ({filteredItems.length} items)
		</span>
		<div class="flex gap-2">
			<button
				class="px-3 py-1 rounded-md border border-slate-700 bg-slate-800 text-sm disabled:opacity-50"
				disabled={currentPage === 1}
				onclick={() => currentPage--}
			>
				Prev
			</button>
			<button
				class="px-3 py-1 rounded-md border border-slate-700 bg-slate-800 text-sm disabled:opacity-50"
				disabled={currentPage === maxPage}
				onclick={() => currentPage++}
			>
				Next
			</button>
		</div>
	</div>
{/if}
