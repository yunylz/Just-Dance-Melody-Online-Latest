<script>
	import { createEventDispatcher } from 'svelte';
	import { Loader2, Upload, Eye, FileText, Check, AlertCircle, X, Trash2, ArrowLeft, ImageIcon } from 'lucide-svelte';
	import API from '$lib/api.js';

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
		title: item?.title || '',
		content: item?.content || '',
		author: item?.author || '',
		category: item?.category || 'general',
		imageUrl: item?.imageUrl || '',
		published: item?.published !== undefined ? item.published : true
	};

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
			dispatch('save', { 
				id: item?.id || item?._id, 
				data: formData 
			});
		} catch (err) {
			error = err.message || 'Failed to save news';
			isSaving = false;
		}
	}

	function goBack() {
		dispatch('cancel');
	}

	function handleDelete() {
		dispatch('deleteReq', item);
	}
</script>

<div class="w-full space-y-6 animate-fade-in pb-12">
	<!-- Top Action Bar -->
	<div class="flex items-center justify-between gap-4">
		<button 
			on:click={goBack}
			class="flex items-center gap-3 text-gray-400 hover:text-white transition-all group"
		>
			<div class="p-2.5 bg-gray-800/60 rounded-xl group-hover:bg-gray-700/60 border border-gray-700/50 transition-all">
				<ArrowLeft class="w-5 h-5" />
			</div>
			<span class="font-bold text-lg">Back to List</span>
		</button>

		<div class="flex items-center gap-3">
			{#if item}
				<button
					on:click={handleDelete}
					disabled={isSaving || isUploading}
					class="p-3 bg-gray-800/60 hover:bg-red-500/20 border border-gray-700/50 hover:border-red-500/30 text-gray-400 hover:text-red-400 rounded-xl transition-all disabled:opacity-50"
				>
					<Trash2 class="w-5 h-5" />
				</button>
			{/if}
			<button
				on:click={handleSave}
				disabled={isSaving || isUploading}
				class="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-yellow-500/20 disabled:opacity-50 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
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

	{#if error}
		<div class="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-3">
			<AlertCircle class="w-5 h-5 shrink-0" />
			{error}
		</div>
	{/if}

	<!-- Main Editor Card -->
	<div class="bg-gray-800/40 backdrop-blur-xl border border-yellow-500/20 rounded-3xl overflow-hidden">

		<!-- Section: Article Meta -->
		<div class="p-6 md:p-8 border-b border-gray-700/50 space-y-6">
			<p class="text-xs font-bold text-gray-500 uppercase tracking-widest">Article Details</p>

			<!-- Headline (full width) -->
			<div>
				<label for="title" class="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Headline</label>
				<input
					id="title"
					type="text"
					bind:value={formData.title}
					placeholder="Enter article headline..."
					class="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl px-5 py-4 text-white text-xl font-bold focus:outline-none focus:border-yellow-500/50 transition-all placeholder-gray-500"
				/>
			</div>

			<!-- Author + Category side by side -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
				<div>
					<label for="author" class="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Author</label>
					<input
						id="author"
						type="text"
						bind:value={formData.author}
						placeholder="e.g. Admin Team"
						class="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500/50 transition-all placeholder-gray-500"
					/>
				</div>
				<div>
					<label for="category" class="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Category</label>
					<div class="relative">
						<select
							id="category"
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

			<!-- Visibility Toggle -->
			<div class="bg-gray-900/40 border border-gray-700/40 rounded-2xl p-5">
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
		</div>

		<!-- Section: Header Image -->
		<div class="p-6 md:p-8 border-b border-gray-700/50 space-y-4">
			<p class="text-xs font-bold text-gray-500 uppercase tracking-widest">Header Image</p>

			{#if formData.imageUrl}
				<!-- Image preview with remove button -->
				<div class="relative w-full aspect-[16/6] rounded-2xl overflow-hidden border border-gray-700/50 group shadow-xl">
					<img src={formData.imageUrl} alt="Header preview" class="w-full h-full object-cover" />
					<div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
						<button 
							on:click={() => formData.imageUrl = ''}
							class="p-3 bg-red-500 text-white rounded-xl hover:bg-red-400 transition-colors shadow-lg flex items-center gap-2 font-bold"
						>
							<X class="w-5 h-5" /> Remove Image
						</button>
					</div>
				</div>
			{:else}
				<!-- Upload dropzone -->
				<label class="flex flex-col items-center justify-center w-full aspect-[16/6] rounded-2xl border-2 border-dashed border-gray-600/50 hover:border-yellow-500/30 bg-gray-700/20 hover:bg-gray-700/30 transition-all cursor-pointer gap-4">
					<input type="file" accept="image/*" class="hidden" on:change={handleUpload} disabled={isUploading} />
					<div class="p-4 bg-gray-700/50 rounded-2xl border border-gray-600/50">
						{#if isUploading}
							<Loader2 class="w-8 h-8 text-yellow-500 animate-spin" />
						{:else}
							<Upload class="w-8 h-8 text-gray-400" />
						{/if}
					</div>
					<div class="text-center">
						<p class="text-sm font-bold text-gray-400">{isUploading ? 'Uploading...' : 'Click to upload image'}</p>
						<p class="text-xs text-gray-500 mt-1">PNG, JPG, GIF, WEBP supported</p>
					</div>
				</label>
			{/if}

			<!-- URL paste field -->
			<div class="relative">
				<ImageIcon class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none z-10" />
				<input
					type="text"
					bind:value={formData.imageUrl}
					placeholder="Or paste an image URL..."
					class="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500/50 transition-all placeholder-gray-500"
				/>
			</div>
		</div>

		<!-- Section: Body Content -->
		<div class="p-6 md:p-8 space-y-4">
			<div class="flex items-center justify-between">
				<p class="text-xs font-bold text-gray-500 uppercase tracking-widest">Body Content (Markdown)</p>
				<button 
					on:click={() => previewMode = !previewMode}
					class="text-xs font-bold flex items-center gap-2 px-4 py-2 rounded-xl transition-all {previewMode ? 'bg-gray-700/60 text-gray-300 border border-gray-600/50' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'} hover:scale-105"
				>
					{#if previewMode}
						<FileText class="w-4 h-4" /> Edit
					{:else}
						<Eye class="w-4 h-4" /> Preview
					{/if}
				</button>
			</div>

			{#if previewMode}
				<div class="w-full min-h-[400px] bg-gray-900/40 border border-gray-700/50 rounded-2xl p-8 overflow-y-auto prose prose-invert prose-yellow max-w-none custom-scrollbar">
					{#if formData.content}
						<div class="markdown-body whitespace-pre-wrap text-gray-300 leading-relaxed">{formData.content}</div>
					{:else}
						<p class="text-gray-600 italic">Nothing to preview yet.</p>
					{/if}
				</div>
			{:else}
				<textarea
					id="content"
					bind:value={formData.content}
					placeholder="Write your article here... Markdown is supported."
					class="w-full min-h-[400px] bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-6 text-white focus:outline-none focus:border-yellow-500/50 transition-all resize-none font-mono text-sm leading-relaxed custom-scrollbar placeholder-gray-500"
				></textarea>
			{/if}
		</div>
	</div>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.1);
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.07);
		border-radius: 3px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.14);
	}

	.animate-fade-in {
		animation: fadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
