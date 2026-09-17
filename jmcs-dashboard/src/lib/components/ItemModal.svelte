<script lang="ts">
	import { X } from 'lucide-svelte';

	let { 
		show = false, 
		item = null, 
		title = 'Edit Item',
		onClose = () => {},
		onSave = async (data: any) => {}
	} = $props<{
		show: boolean;
		item: any;
		title: string;
		onClose: () => void;
		onSave: (data: any) => Promise<void>;
	}>();

	let formData = $state<any>({});
	let saving = $state(false);

	$effect(() => {
		if (show) {
			formData = item ? JSON.parse(JSON.stringify(item)) : {};
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		try {
			saving = true;
			await onSave(formData);
			onClose();
		} catch (err) {
			alert('Failed to save: ' + (err as Error).message);
		} finally {
			saving = false;
		}
	}
</script>

{#if show}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
			<div class="flex items-center justify-between p-4 border-b border-slate-800">
				<h3 class="text-lg font-semibold text-white">{title}</h3>
				<button onclick={onClose} class="text-slate-400 hover:text-white transition-colors">
					<X class="w-5 h-5" />
				</button>
			</div>
			
			<div class="p-6 overflow-y-auto flex-1">
				<form id="generic-form" onsubmit={handleSubmit} class="space-y-4">
					<!-- Extremely basic generic form for MVP, we rely on JSON for complex fields -->
					<div class="space-y-2">
						<label class="block text-sm font-medium text-slate-300">Raw JSON Edit</label>
						<textarea 
							class="w-full bg-slate-800 border border-slate-700 rounded-md p-3 text-sm font-mono text-slate-300 h-64 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
							value={JSON.stringify(formData, null, 2)}
							onchange={(e) => {
								try {
									formData = JSON.parse(e.currentTarget.value);
								} catch(err) {
									// ignore parse errors while typing
								}
							}}
						></textarea>
					</div>
				</form>
			</div>

			<div class="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
				<button 
					type="button" 
					onclick={onClose}
					class="px-4 py-2 rounded-md font-medium text-sm text-slate-300 hover:bg-slate-800 transition-colors"
				>
					Cancel
				</button>
				<button 
					form="generic-form"
					type="submit" 
					disabled={saving}
					class="px-4 py-2 rounded-md font-medium text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
				>
					{saving ? 'Saving...' : 'Save'}
				</button>
			</div>
		</div>
	</div>
{/if}
