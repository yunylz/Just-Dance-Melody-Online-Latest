<script lang="ts">
	import { getUgcId } from "./ugc-constants";

	interface Props {
		show: boolean;
		ugc: any;
		approved: boolean;
		banReason: string;
		moderating: boolean;
		onClose: () => void;
		onBanReasonChange: (reason: string) => void;
		onConfirm: () => void;
	}

	let {
		show,
		ugc,
		approved,
		banReason,
		moderating,
		onClose,
		onBanReasonChange,
		onConfirm,
	}: Props = $props();
</script>

{#if show && ugc}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
			<div class="p-5 border-b border-slate-800">
				<h3 class="text-lg font-bold text-white">{approved ? "Approve UGC" : "Deny UGC"}</h3>
				<p class="text-xs text-slate-500 font-mono mt-1">{getUgcId(ugc)}</p>
			</div>
			<div class="p-5 space-y-4">
				{#if !approved}
					<div class="space-y-2">
						<label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ban Reason</label>
						<textarea
							value={banReason}
							oninput={(e) => onBanReasonChange(e.currentTarget.value)}
							placeholder="Why is this being denied?"
							class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 resize-none h-24"
						></textarea>
					</div>
				{:else}
					<p class="text-sm text-slate-400">This UGC will be approved and its content made visible to all users.</p>
				{/if}
			</div>
			<div class="p-5 border-t border-slate-800 flex justify-end gap-3">
				<button onclick={onClose} class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
				<button
					onclick={onConfirm}
					disabled={moderating}
					class="px-5 py-2 {approved ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'} text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50"
				>
					{moderating ? "Processing..." : approved ? "Approve" : "Deny"}
				</button>
			</div>
		</div>
	</div>
{/if}
