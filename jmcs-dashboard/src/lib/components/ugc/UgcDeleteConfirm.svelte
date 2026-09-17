<script lang="ts">
	import { getUgcId } from "./ugc-constants";

	interface Props {
		show: boolean;
		ugc: any;
		deleting: boolean;
		onClose: () => void;
		onConfirm: () => void;
	}

	let {
		show,
		ugc,
		deleting,
		onClose,
		onConfirm,
	}: Props = $props();
</script>

{#if show && ugc}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
			<div class="p-5 border-b border-slate-800">
				<h3 class="text-lg font-bold text-white">Delete UGC</h3>
				<p class="text-xs text-slate-500 font-mono mt-1">{getUgcId(ugc)}</p>
			</div>
			<div class="p-5">
				<p class="text-sm text-slate-400">Are you sure you want to soft-delete this UGC? This action can be reversed by an admin.</p>
			</div>
			<div class="p-5 border-t border-slate-800 flex justify-end gap-3">
				<button onclick={onClose} class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
				<button
					onclick={onConfirm}
					disabled={deleting}
					class="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50"
				>
					{deleting ? "Deleting..." : "Delete"}
				</button>
			</div>
		</div>
	</div>
{/if}
