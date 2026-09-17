<script lang="ts">
	import { getUgcId } from "./ugc-constants";

	interface Props {
		show: boolean;
		ugc: any;
		tagsInput: string;
		saving: boolean;
		onClose: () => void;
		onTagsChange: (tags: string) => void;
		onSave: () => void;
	}

	let {
		show,
		ugc,
		tagsInput,
		saving,
		onClose,
		onTagsChange,
		onSave,
	}: Props = $props();
</script>

{#if show && ugc}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
			<div class="p-5 border-b border-slate-800">
				<h3 class="text-lg font-bold text-white">Manage Tags</h3>
				<p class="text-xs text-slate-500 font-mono mt-1">{getUgcId(ugc)}</p>
			</div>
			<div class="p-5 space-y-4">
				<div class="space-y-2">
					<label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tags (comma-separated)</label>
					<input
						value={tagsInput}
						oninput={(e) => onTagsChange(e.currentTarget.value)}
						type="text"
						placeholder="e.g. featured, mod-pick, trending"
						class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
					/>
				</div>
				<div class="flex flex-wrap gap-2">
					{#each tagsInput.split(",").map(t => t.trim()).filter(Boolean) as tag}
						<span class="text-xs bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full font-medium">{tag}</span>
					{/each}
				</div>
			</div>
			<div class="p-5 border-t border-slate-800 flex justify-end gap-3">
				<button onclick={onClose} class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
				<button
					onclick={onSave}
					disabled={saving}
					class="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50"
				>
					{saving ? "Saving..." : "Save Tags"}
				</button>
			</div>
		</div>
	</div>
{/if}
