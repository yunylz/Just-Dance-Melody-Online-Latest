<script>
	import { createEventDispatcher } from 'svelte';
	import { AlertTriangle, Loader2 } from 'lucide-svelte';

	export let show = false;
	export let item = null;

	const dispatch = createEventDispatcher();
	let isDeleting = false;
	let error = null;

	async function handleDelete() {
		if (!item) return;
		isDeleting = true;
		error = null;

		try {
			dispatch('deleteNews', { id: item.id || item._id });
		} catch (err) {
			error = err.message || 'Failed to delete news item';
			isDeleting = false;
		}
	}

	export function handleDeleteResult(success, errorMessage = null) {
		isDeleting = false;
		if (success) {
			close();
		} else {
			error = errorMessage;
		}
	}

	function close() {
		if (isDeleting) return;
		show = false;
		error = null;
		dispatch('closeModal');
	}
</script>

{#if show}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm"
		on:click={close}
	>
		<div
			class="relative w-full max-w-md bg-gray-800/80 backdrop-blur-xl border border-red-500/30 rounded-3xl p-8 shadow-2xl"
			on:click|stopPropagation
		>
			<div class="flex flex-col items-center text-center">
				<div class="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6">
					<AlertTriangle class="w-8 h-8 text-red-400" />
				</div>

				<h2 class="text-2xl font-bold text-white mb-2">Delete News?</h2>
				<p class="text-gray-400 mb-8">
					Are you sure you want to delete <span class="text-white font-semibold">"{item?.title}"</span>? This action cannot be undone.
				</p>

				{#if error}
					<div class="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
						{error}
					</div>
				{/if}

				<div class="flex flex-col w-full gap-3">
					<button
						on:click={handleDelete}
						disabled={isDeleting}
						class="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
					>
						{#if isDeleting}
							<Loader2 class="w-5 h-5 animate-spin" />
							Deleting...
						{:else}
							Delete Permanently
						{/if}
					</button>
					<button
						on:click={close}
						disabled={isDeleting}
						class="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-all"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
