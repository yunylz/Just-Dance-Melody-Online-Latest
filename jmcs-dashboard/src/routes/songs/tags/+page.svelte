<script lang="ts">
	import { onMount } from "svelte";
	import { fetchApi } from "$lib/api";
	import { Tag, Plus, Edit2, Trash2, Database, AlertCircle, Search, Music } from "lucide-svelte";
	import { toast } from "$lib/toast";

	let tags: any[] = $state([]);
	let loading = $state(true);
	let searchTerm = $state("");
	let showModal = $state(false);
	let migrating = $state(false);

	let editMode = $state(false);
	let currentTag: any = $state({ name: "", color: "#4f46e5", description: "" });
	let sortBy = $state("az"); // 'az', 'za', 'usage'

	onMount(async () => {
		await loadTags();
	});

	async function loadTags() {
		loading = true;
		try {
			const res = await fetchApi<any>("manage-tags/list?limit=9999");
			tags = res.items || [];
		} catch (e: any) {
			toast.error("Failed to load tags: " + e.message);
		} finally {
			loading = false;
		}
	}

	function openCreate() {
		editMode = false;
		currentTag = { name: "", color: "#4f46e5", description: "" };
		showModal = true;
	}

	function openEdit(tag: any) {
		editMode = true;
		currentTag = { ...tag };
		showModal = true;
	}

	async function saveTag() {
		try {
			if (editMode) {
				await fetchApi(`manage-tags/update/${currentTag._id}`, {
					method: "PUT",
					body: JSON.stringify(currentTag)
				});
				toast.success("Tag updated successfully!");
			} else {
				await fetchApi("manage-tags/create", {
					method: "POST",
					body: JSON.stringify(currentTag)
				});
				toast.success("Tag created successfully!");
			}
			showModal = false;
			await loadTags();
		} catch (e: any) {
			toast.error((editMode ? "Update" : "Create") + " failed: " + e.message);
		}
	}

	async function deleteTag(id: string) {
		if (confirm("Are you sure you want to delete this tag? This action cannot be undone.")) {
			try {
				await fetchApi(`manage-tags/delete/${id}`, { method: "DELETE" });
				toast.success("Tag deleted successfully!");
				await loadTags();
			} catch (e: any) {
				toast.error("Delete failed: " + e.message);
			}
		}
	}

	async function runMigration() {
		if (!confirm("This will scan all songs, extract string tags to the database, and convert them to references. Proceed?")) return;
		
		migrating = true;
		try {
			const res = await fetchApi<any>("migrate-tags/run", { method: "POST" });
			toast.success(res.message || "Migration complete!");
			await loadTags();
		} catch (e: any) {
			toast.error("Migration failed: " + e.message);
		} finally {
			migrating = false;
		}
	}

	const filteredTags = $derived(
		tags.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || (t.description || "").toLowerCase().includes(searchTerm.toLowerCase()))
		.sort((a, b) => {
			if (sortBy === "az") return a.name.localeCompare(b.name);
			if (sortBy === "za") return b.name.localeCompare(a.name);
			if (sortBy === "usage") return (b.songCount || 0) - (a.songCount || 0);
			return 0;
		})
	);
</script>

<div class="max-w-[1400px] mx-auto space-y-6">
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-xl shadow-xl">
		<div class="flex items-center gap-4">
			<div class="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
				<Tag class="w-6 h-6" />
			</div>
			<div>
				<h1 class="text-2xl font-black text-white tracking-tight">Song Tags</h1>
				<p class="text-slate-500 text-xs font-mono uppercase tracking-widest mt-1">Manage global song tags</p>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<button 
				onclick={runMigration}
				disabled={migrating}
				class="flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl transition-all font-bold text-sm border border-amber-500/20"
			>
				<Database class="w-4 h-4" />
				{migrating ? "Migrating..." : "Run Migration"}
			</button>
			<button 
				onclick={openCreate}
				class="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-bold text-sm shadow-lg shadow-indigo-500/20"
			>
				<Plus class="w-4 h-4" /> Create Tag
			</button>
		</div>
	</div>

	<!-- Controls -->
	<div class="flex items-center justify-between gap-4">
		<div class="relative w-full max-w-md">
			<Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
			<input 
				type="text" 
				bind:value={searchTerm}
				placeholder="Search tags..." 
				class="w-full bg-slate-900/40 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
			/>
		</div>
		<div class="flex items-center gap-4">
			<select
				bind:value={sortBy}
				class="bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500 transition-all appearance-none"
			>
				<option value="az">Sort: A-Z</option>
				<option value="za">Sort: Z-A</option>
				<option value="usage">Sort: Most Used</option>
			</select>
			<div class="text-xs font-black text-slate-500 uppercase tracking-widest">
				{filteredTags.length} Tags Total
			</div>
		</div>
	</div>

	<!-- Grid -->
	{#if loading}
		<div class="flex flex-col items-center justify-center py-20 gap-4">
			<div class="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{#each filteredTags as tag}
				<div class="group relative bg-slate-900/40 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all overflow-hidden">
					<div class="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" style="background-color: {tag.color}"></div>
					
					<div class="relative flex items-start justify-between gap-4">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-3 mb-2">
								<div class="w-3 h-3 rounded-full shadow-sm" style="background-color: {tag.color}"></div>
								<h3 class="font-bold text-white truncate text-lg">{tag.name}</h3>
							</div>
							{#if tag.description}
								<p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">{tag.description}</p>
							{:else}
								<p class="text-xs text-slate-600 italic">No description</p>
							{/if}
						</div>
						<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
							<a href="/songs?tag={tag._id}" class="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold" title="View Songs">
								<Music class="w-3.5 h-3.5" />
								{tag.songCount || 0}
							</a>
							<button onclick={() => openEdit(tag)} class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all" title="Edit">
								<Edit2 class="w-3.5 h-3.5" />
							</button>
							<button onclick={() => deleteTag(tag._id)} class="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all" title="Delete">
								<Trash2 class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>
				</div>
			{:else}
				<div class="col-span-full text-center py-20 bg-slate-900/20 rounded-3xl border border-slate-800/50 border-dashed">
					<div class="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4 text-slate-500">
						<AlertCircle class="w-8 h-8" />
					</div>
					<h3 class="text-lg font-bold text-white mb-2">No Tags Found</h3>
					<p class="text-slate-500 text-sm max-w-md mx-auto">There are no tags matching your criteria, or none exist yet. Run the migration to populate tags from your songs.</p>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
		<div class="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
			<div class="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
				<h2 class="text-lg font-black text-white">{editMode ? 'Edit Tag' : 'Create Tag'}</h2>
				<button onclick={() => showModal = false} class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all">
					&times;
				</button>
			</div>
			
			<div class="p-6 space-y-6 overflow-y-auto">
				<div class="space-y-2">
					<label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tag Name</label>
					<input 
						bind:value={currentTag.name} 
						type="text" 
						placeholder="e.g. Main, K-Pop, Extreme"
						class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white outline-none focus:border-indigo-500 transition-all font-medium"
					/>
				</div>

				<div class="space-y-2">
					<label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Color Theme</label>
					<div class="flex items-center gap-4">
						<input 
							bind:value={currentTag.color} 
							type="color" 
							class="w-14 h-14 rounded-xl cursor-pointer bg-slate-950 border border-slate-800"
						/>
						<input 
							bind:value={currentTag.color} 
							type="text" 
							class="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white outline-none focus:border-indigo-500 transition-all font-mono uppercase"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Description (Optional)</label>
					<textarea 
						bind:value={currentTag.description} 
						rows="3"
						placeholder="What is this tag for?"
						class="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3.5 text-white outline-none focus:border-indigo-500 transition-all font-medium resize-none"
					></textarea>
				</div>
			</div>

			<div class="p-6 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/50">
				<button onclick={() => showModal = false} class="px-5 py-2.5 text-slate-400 hover:text-white font-bold text-sm transition-all">Cancel</button>
				<button onclick={saveTag} class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-bold text-sm shadow-lg shadow-indigo-500/20 active:scale-95">
					{editMode ? 'Save Changes' : 'Create Tag'}
				</button>
			</div>
		</div>
	</div>
{/if}
