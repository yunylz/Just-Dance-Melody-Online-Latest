<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { X, Loader2, Upload, Eye, FileText, Check, AlertCircle, ImageIcon } from 'lucide-svelte';
	import API from '$lib/api.js';

	export let show = false;
	export let item = null; // null for create, object for edit

	const dispatch = createEventDispatcher();
	let isSaving = false;
	let isUploading = false;
	let error = null;
	let previewMode = false;

	const CATEGORIES = [
		{ id: 'general', label: 'General' },
		{ id: 'update', label: 'Update' },
		{ id: 'event', label: 'Event' },
		{ id: 'maintenance', label: 'Maintenance' },
		{ id: 'community', label: 'Community' }
	];

	let formData = {
		title: '',
		content: '',
		author: '',
		category: 'general',
		imageUrl: '',
		published: true
	};

	$: if (show && item) {
		formData = {
			title: item.title || '',
			content: item.content || '',
			author: item.author || '',
			category: item.category || 'general',
			imageUrl: item.imageUrl || '',
			published: item.published !== undefined ? item.published : true
		};
	} else if (show && !item) {
		formData = {
			title: '',
			content: '',
			author: '',
			category: 'general',
			imageUrl: '',
			published: true
		};
	}

	async function handleUpload(e) {
		const file = e.target.files[0];
		if (!file) return;

		isUploading = true;
		error = null;
		try {
			const url = await API.uploadNewsImage(file);
			formData.imageUrl = url;
		} catch (err) {
			error = err.message || 'Failed to upload image';
		} finally {
			isUploading = false;
		}
	}

	async function handleSave() {
		if (!formData.title || !formData.content || !formData.author) {
			error = 'Title, content, and author are required';
			return;
		}

		isSaving = true;
		error = null;

		try {
			dispatch('saveNews', { 
				id: item?.id || item?._id, 
				data: formData 
			});
		} catch (err) {
			error = err.message || 'Failed to save news';
			isSaving = false;
		}
	}

	export function handleSaveResult(success, errorMessage = null) {
		isSaving = false;
		if (success) {
			close();
		} else {
			error = errorMessage;
		}
	}

	function close() {
		if (isSaving || isUploading) return;
		show = false;
		error = null;
		previewMode = false;
		dispatch('closeModal');
	}
</script>

{#if show}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md"
		on:click={close}
	>
		<div
			class="relative w-full max-w-4xl bg-gray-900 border border-yellow-500/20 rounded-3xl overflow-hidden shadow-2xl shadow-yellow-500/5 flex flex-col max-h-[90vh]"
			on:click|stopPropagation
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-gray-800">
				<div>
					<h2 class="text-xl font-bold text-white">
						{item ? 'Edit Article' : 'New Article'}
					</h2>
					<p class="text-sm text-gray-500 mt-0.5">
						{item ? 'Update content and settings.' : 'Fill in the details to publish.'}
					</p>
				</div>
				<button
					on:click={close}
					class="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-500 hover:text-white"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Body -->
			<div class="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
				{#if error}
					<div class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3">
						<AlertCircle class="w-5 h-5 shrink-0" />
						{error}
					</div>
				{/if}

				<!-- Title -->
				<div>
					<label for="modal-title" class="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Headline</label>
					<input
						id="modal-title"
						type="text"
						bind:value={formData.title}
						placeholder="Enter article headline..."
						class="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl px-4 py-3 text-white font-bold text-lg focus:outline-none focus:border-yellow-500/50 transition-all placeholder-gray-500"
					/>
				</div>

				<!-- Author + Category -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="modal-author" class="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Author</label>
						<input
							id="modal-author"
							type="text"
							bind:value={formData.author}
							placeholder="e.g. Admin Team"
							class="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 transition-all placeholder-gray-500"
						/>
					</div>
					<div>
						<label for="modal-category" class="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Category</label>
						<div class="relative">
							<select
								id="modal-category"
								bind:value={formData.category}
								class="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 transition-all appearance-none cursor-pointer"
							>
								{#each CATEGORIES as cat}
									<option value={cat.id} class="bg-gray-900">{cat.label}</option>
								{/each}
							</select>
							<div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
							</div>
						</div>
					</div>
				</div>

				<!-- Image URL + Upload -->
				<div>
					<label class="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Header Image</label>
					<div class="flex gap-2">
						<div class="relative flex-1 flex items-center">
							<ImageIcon class="absolute left-3 w-4 h-4 text-gray-500 pointer-events-none z-10" />
							<input
								type="text"
								bind:value={formData.imageUrl}
								placeholder="Or paste an image URL..."
								class="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 transition-all placeholder-gray-500"
							/>
						</div>
						<label class="p-3 bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl text-gray-400 hover:text-yellow-400 hover:border-yellow-500/30 cursor-pointer transition-all flex items-center justify-center">
							<input type="file" accept="image/*" class="hidden" on:change={handleUpload} disabled={isUploading} />
							{#if isUploading}
								<Loader2 class="w-5 h-5 animate-spin" />
							{:else}
								<Upload class="w-5 h-5" />
							{/if}
						</label>
					</div>
					{#if formData.imageUrl}
						<div class="mt-3 relative aspect-video rounded-2xl overflow-hidden border border-gray-700 group">
							<img src={formData.imageUrl} alt="Preview" class="w-full h-full object-cover" />
							<button
								on:click={() => formData.imageUrl = ''}
								class="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
							>
								<X class="w-4 h-4" />
							</button>
						</div>
					{/if}
				</div>

				<!-- Visibility -->
				<div class="bg-gray-800/30 border border-gray-700/40 rounded-2xl p-5">
					<label class="flex items-center justify-between cursor-pointer group">
						<div>
							<p class="font-bold text-white group-hover:text-yellow-400 transition-colors">Publicly Visible</p>
							<p class="text-sm text-gray-500 mt-0.5">Show this article on the public news feed.</p>
						</div>
						<div class="relative w-14 h-7 flex-shrink-0">
							<input type="checkbox" bind:checked={formData.published} class="sr-only peer" />
							<div class="w-14 h-7 bg-gray-700 rounded-full border border-gray-600 peer-checked:bg-yellow-500/20 peer-checked:border-yellow-500/50 transition-all"></div>
							<div class="absolute left-1 top-1 w-5 h-5 bg-gray-400 rounded-full transition-all peer-checked:left-8 peer-checked:bg-yellow-500 shadow-lg"></div>
						</div>
					</label>
				</div>

				<!-- Content Editor -->
				<div>
					<div class="flex items-center justify-between mb-3">
						<label class="block text-sm font-bold text-gray-400 uppercase tracking-wider">Body Content (Markdown)</label>
						<button 
							on:click={() => previewMode = !previewMode}
							class="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all {previewMode ? 'bg-gray-700/60 text-gray-300 border border-gray-600/50' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'} hover:scale-105"
						>
							{#if previewMode}
								<FileText class="w-3.5 h-3.5" /> Edit
							{:else}
								<Eye class="w-3.5 h-3.5" /> Preview
							{/if}
						</button>
					</div>

					{#if previewMode}
						<div class="min-h-[300px] bg-gray-800/20 border border-gray-700/50 rounded-2xl p-6 overflow-y-auto prose prose-invert prose-sm max-w-none">
							{#if formData.content}
								<div class="whitespace-pre-wrap text-gray-300 leading-relaxed">{formData.content}</div>
							{:else}
								<p class="text-gray-600 italic">Nothing to preview yet...</p>
							{/if}
						</div>
					{:else}
						<textarea
							id="modal-content"
							bind:value={formData.content}
							placeholder="Write your story here... Markdown is supported."
							class="w-full min-h-[300px] bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-5 text-white focus:outline-none focus:border-yellow-500/50 transition-all resize-none font-mono text-sm custom-scrollbar placeholder-gray-500"
						></textarea>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="p-5 border-t border-gray-800 flex justify-end gap-3">
				<button
					on:click={close}
					disabled={isSaving || isUploading}
					class="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-all disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					on:click={handleSave}
					disabled={isSaving || isUploading}
					class="px-8 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-50 flex items-center gap-2 hover:scale-105 active:scale-95"
				>
					{#if isSaving}
						<Loader2 class="w-5 h-5 animate-spin" />
						Saving...
					{:else}
						<Check class="w-5 h-5" />
						{item ? 'Save Changes' : 'Publish Article'}
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.1);
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.08);
		border-radius: 3px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.15);
	}
</style>
