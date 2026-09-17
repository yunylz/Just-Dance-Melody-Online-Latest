<script>
	import { onMount } from 'svelte';
	import { Newspaper, Loader2, Plus, Search, RefreshCw, PenTool } from 'lucide-svelte';
	import API from '$lib/api.js';
	import Utils from '$lib/utils.js';
	
	import NewsHeader from '$lib/components/Hub/Admin/News/NewsHeader.svelte';
	import NewsCard from '$lib/components/Hub/Admin/News/NewsCard.svelte';
	import NewsEditor from '$lib/components/Hub/Admin/News/NewsEditor.svelte';
	import DeleteModal from '$lib/components/Hub/Admin/News/DeleteModal.svelte';

	let newsItems = [];
	let loading = true;
	let searchTerm = '';
	let filteredItems = [];
	
	let view = 'list'; // 'list' or 'editor'
	let selectedItem = null;
	let showDeleteModal = false;
	
	let deleteModalRef;

	const PAGE_SIZE = 10;
	let currentPage = 1;

	$: {
		if (searchTerm) {
			const lower = searchTerm.toLowerCase();
			filteredItems = newsItems.filter(item => 
				item.title?.toLowerCase().includes(lower) ||
				item.author?.toLowerCase().includes(lower) ||
				item.category?.toLowerCase().includes(lower)
			);
		} else {
			filteredItems = newsItems;
		}
		currentPage = 1;
	}

	$: totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
	$: pagedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

	async function loadNews() {
		loading = true;
		try {
			newsItems = await API.getNews();
		} catch (error) {
			console.error('Failed to load news:', error);
		} finally {
			loading = false;
		}
	}

	onMount(loadNews);

	function openCreate() {
		selectedItem = null;
		view = 'editor';
	}

	function openEdit(item) {
		selectedItem = item;
		view = 'editor';
	}

	function confirmDelete(item) {
		selectedItem = item;
		showDeleteModal = true;
	}

	async function handleSaveNews(event) {
		const { id, data } = event.detail;
		try {
			if (id) {
				await API.updateNews(id, data);
			} else {
				await API.createNews(data);
			}
			await loadNews();
			view = 'list';
		} catch (error) {
			alert('Failed to save: ' + error.message);
		}
	}

	async function handleDeleteNews(event) {
		const { id } = event.detail;
		try {
			await API.deleteNews(id);
			await loadNews();
			showDeleteModal = false;
			view = 'list';
			if (deleteModalRef) deleteModalRef.handleDeleteResult(true);
		} catch (error) {
			if (deleteModalRef) deleteModalRef.handleDeleteResult(false, error.message);
		}
	}

	function goToPage(page) {
		currentPage = Math.max(1, Math.min(page, totalPages));
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<svelte:head>
	<title>{Utils.getTitle('Manage News', true)}</title>
</svelte:head>

<div class="relative min-h-screen overflow-hidden">
	<!-- Ambient Background Orbs -->
	<div class="absolute inset-0 overflow-hidden pointer-events-none">
		<div class="absolute top-32 left-20 w-40 h-40 bg-pink-500/8 rounded-full blur-3xl animate-pulse"></div>
		<div class="absolute top-80 right-32 w-36 h-36 bg-purple-500/8 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
		<div class="absolute bottom-40 left-1/4 w-32 h-32 bg-blue-500/8 rounded-full blur-3xl animate-pulse animation-delay-4000"></div>
	</div>

	<div class="relative z-10 p-4 md:p-8 space-y-6">
		<NewsHeader />

		{#if view === 'list'}
			<div class="space-y-6">
				<div class="bg-gray-800/40 backdrop-blur-xl border border-yellow-500/20 rounded-3xl p-6 md:p-8 space-y-8">
					<div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
						<div>
							<h2 class="text-2xl font-bold text-white mb-2 flex items-center gap-2">
								Articles Feed
								{#if loading}
									<Loader2 class="w-5 h-5 text-yellow-500 animate-spin" />
								{/if}
							</h2>
							<p class="text-gray-400">
								Manage and edit your news announcements
							</p>
						</div>
						
						<div class="flex flex-wrap items-center gap-3">
							<div class="relative flex-1 md:w-64 min-w-[200px]">
								<Search class="absolute z-10 left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
								<input
									type="text"
									placeholder="Search news..."
									bind:value={searchTerm}
									class="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl pl-11 pr-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-yellow-500/50 transition-all"
								/>
							</div>
							<button
								on:click={openCreate}
								class="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all"
							>
								<Plus class="w-5 h-5" />
								New Article
							</button>
						</div>
					</div>

					{#if loading && newsItems.length === 0}
						<div class="py-24 text-center">
							<Loader2 class="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
							<p class="text-gray-400 font-medium">Loading news articles...</p>
						</div>
					{:else if newsItems.length === 0}
						<div class="py-24 text-center bg-gray-900/20 rounded-3xl border border-dashed border-gray-700/50">
							<div class="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
								<Newspaper class="w-10 h-10 text-gray-600" />
							</div>
							<h3 class="text-xl font-bold text-gray-300 mb-2">No Articles Found</h3>
							<p class="text-gray-500 mb-8 max-w-sm mx-auto">Start by creating your first announcement for the community.</p>
							<button
								on:click={openCreate}
								class="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-yellow-500/20"
							>
								Create New Article
							</button>
						</div>
					{:else}
						<div class="grid grid-cols-1 gap-4">
							{#each pagedItems as item (item.id || item._id)}
								<NewsCard
									{item}
									onSelect={() => openEdit(item)}
								/>
							{/each}
						</div>

						{#if totalPages > 1}
							<div class="flex items-center justify-between pt-8 border-t border-gray-700/50">
								<p class="text-sm text-gray-500 font-medium">
									Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredItems.length)} of {filteredItems.length}
								</p>
								<div class="flex items-center gap-2">
									<button
										on:click={() => goToPage(currentPage - 1)}
										disabled={currentPage === 1}
										class="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-xl text-gray-300 disabled:opacity-40 transition-all hover:bg-gray-700/50"
									>
										Prev
									</button>
									{#each Array(totalPages) as _, i}
										<button
											on:click={() => goToPage(i + 1)}
											class="w-10 h-10 rounded-xl font-bold transition-all {currentPage === i + 1 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-gray-800/50 text-gray-400 hover:text-white border border-gray-700/50 hover:bg-gray-700/50'}"
										>
											{i + 1}
										</button>
									{/each}
									<button
										on:click={() => goToPage(currentPage + 1)}
										disabled={currentPage === totalPages}
										class="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-xl text-gray-300 disabled:opacity-40 transition-all hover:bg-gray-700/50"
									>
										Next
									</button>
								</div>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		{:else}
			<NewsEditor 
				item={selectedItem} 
				on:cancel={() => view = 'list'} 
				on:save={handleSaveNews}
				on:deleteReq={(e) => confirmDelete(e.detail)}
			/>
		{/if}
	</div>

	<!-- Delete Modal -->
	<DeleteModal
		bind:this={deleteModalRef}
		bind:show={showDeleteModal}
		item={selectedItem}
		on:closeModal={() => showDeleteModal = false}
		on:deleteNews={handleDeleteNews}
	/>
</div>

<style>
	.animation-delay-2000 { animation-delay: 2s; }
	.animation-delay-4000 { animation-delay: 4s; }
</style>
