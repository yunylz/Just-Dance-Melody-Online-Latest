<script lang="ts">
	import { Video, CheckCircle, XCircle, Star, Tag } from "lucide-svelte";
	import { getTypeInfo, getUgcId, formatTimestamp } from "./ugc-constants";

	interface Props {
		show: boolean;
		ugc: any;
		onClose: () => void;
		onModerate: (ugc: any, approved: boolean) => void;
		onToggleFeature: (ugc: any) => void;
		onOpenTags: (ugc: any) => void;
	}

	let {
		show,
		ugc,
		onClose,
		onModerate,
		onToggleFeature,
		onOpenTags,
	}: Props = $props();

	let detailTab = $state<"details" | "actions" | "raw">("details");
</script>

{#if show && ugc}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
			<!-- Header -->
			<div class="flex items-center justify-between p-5 border-b border-slate-800">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
						<svelte:component this={getTypeInfo(ugc.type).icon} class="w-5 h-5" />
					</div>
					<div>
						<h3 class="text-lg font-bold text-white">UGC Detail</h3>
						<p class="text-xs text-slate-500 font-mono">{getUgcId(ugc)}</p>
					</div>
				</div>
				<button onclick={onClose} class="text-slate-400 hover:text-white text-xl font-bold">&times;</button>
			</div>

			<!-- Tabs -->
			<div class="flex gap-1 px-5 pt-4 border-b border-slate-800">
				{#each [{ id: "details", label: "Details" }, { id: "actions", label: "Actions" }, { id: "raw", label: "Raw Data" }] as tab}
					<button
						onclick={() => (detailTab = tab.id as any)}
						class="px-4 py-2 text-xs font-bold rounded-t-lg transition-all {detailTab === tab.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}"
					>{tab.label}</button>
				{/each}
			</div>

			<div class="flex-1 overflow-y-auto p-5 space-y-4">
				{#if detailTab === "details"}
					<div class="grid grid-cols-2 gap-4">
						{@render DetailField({ label: "UGC ID", value: getUgcId(ugc), mono: true })}
						{@render DetailField({ label: "Type", value: getTypeInfo(ugc.type).label })}
						{@render DetailField({ label: "Map Name", value: ugc.mapName || "-" })}
						{@render DetailField({ label: "Profile ID", value: ugc.profileId || "-", mono: true })}
						{@render DetailField({ label: "Game Version", value: ugc.gameVersion || "-" })}
						{@render DetailField({ label: "Platform", value: ugc.platform || "-" })}
						{@render DetailField({ label: "Created", value: formatTimestamp(ugc.time) })}
						{@render DetailField({ label: "Country", value: ugc.country ?? "-" })}
						{@render DetailField({ label: "Player Name", value: ugc.name || "-" })}
						{@render DetailField({ label: "Avatar", value: ugc.avatar ?? "-" })}
						{@render DetailField({ label: "Border", value: ugc.portraitBorder ?? "-" })}
						{@render DetailField({ label: "Likes", value: ugc.likes ?? 0 })}
						{@render DetailField({ label: "Views", value: ugc.views ?? 0 })}
						{@render DetailField({ label: "Reports", value: ugc.reports ?? 0 })}
						{@render DetailField({ label: "Featured", value: ugc.featured ? formatTimestamp(ugc.featured) : "No" })}
						{@render DetailField({ label: "Like (me)", value: ugc.like ? "Yes" : "No" })}

						{#if ugc.type === "ch"}
							{@render DetailField({ label: "Coach", value: ugc.coach ?? "-" })}
							{@render DetailField({ label: "Device", value: ugc.device ?? "-" })}
							{@render DetailField({ label: "Score", value: ugc.score?.toLocaleString() ?? "-" })}
							{@render DetailField({ label: "Moves", value: ugc.moves ? `${ugc.moves.substring(0, 20)}...` : "-", mono: true })}
						{/if}

						{#if ugc.type === "cr"}
							{@render DetailField({ label: "Contest", value: ugc.contest ?? "-" })}
							{@render DetailField({ label: "Sequence", value: ugc.sequence ?? "-" })}
						{/if}

						{#if ugc.banReason}
							<div class="col-span-2">
								<label class="text-[10px] font-black text-red-400 uppercase tracking-widest">Ban Reason</label>
								<p class="text-sm text-red-300 bg-red-500/10 rounded-lg p-3 mt-1">{ugc.banReason}</p>
							</div>
						{/if}
					</div>

					<!-- Content Files -->
					{#if ugc.content}
						<div class="pt-4 border-t border-slate-800">
							<label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Content Files</label>
							<div class="mt-2 space-y-2">
								{#each Object.entries(ugc.content) as [filename, info]}
									<div class="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between">
										<div class="flex items-center gap-3">
											<Video class="w-4 h-4 text-slate-400" />
											<div>
												<p class="text-sm text-white font-medium">{filename}</p>
												<p class="text-xs text-slate-500">{info.mimetype}</p>
											</div>
										</div>
										{#if info.url}
											<a href={info.url} target="_blank" class="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View URL</a>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Tags -->
					{#if ugc.tags?.length}
						<div class="pt-4 border-t border-slate-800">
							<label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tags</label>
							<div class="mt-2 flex flex-wrap gap-2">
								{#each ugc.tags as tag}
									<span class="text-xs bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full font-medium">{tag}</span>
								{/each}
							</div>
						</div>
					{/if}
				{:else if detailTab === "actions"}
					<div class="space-y-4">
						<!-- Moderation -->
						<div class="bg-slate-800/30 rounded-xl p-5 space-y-3">
							<h4 class="text-sm font-bold text-white">Moderation</h4>
							<p class="text-xs text-slate-400">Approve or deny this UGC content.</p>
							<div class="flex gap-3">
								<button
									onclick={() => { onClose(); onModerate(ugc, true); }}
									disabled={ugc.approved === 1}
									class="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40"
								>
									<CheckCircle class="w-4 h-4" /> Approve
								</button>
								<button
									onclick={() => { onClose(); onModerate(ugc, false); }}
									disabled={ugc.approved === 0}
									class="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40"
								>
									<XCircle class="w-4 h-4" /> Deny
								</button>
							</div>
						</div>

						<!-- Feature -->
						<div class="bg-slate-800/30 rounded-xl p-5 space-y-3">
							<h4 class="text-sm font-bold text-white">Featured Status</h4>
							<p class="text-xs text-slate-400">{ugc.featured ? "This UGC is currently featured." : "This UGC is not featured."}</p>
							<button
								onclick={() => { onClose(); onToggleFeature(ugc); }}
								class="flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg text-xs font-bold transition-all"
							>
								<Star class="w-4 h-4" />
								{ugc.featured ? "Unfeature" : "Feature"}
							</button>
						</div>

						<!-- Tags -->
						<div class="bg-slate-800/30 rounded-xl p-5 space-y-3">
							<h4 class="text-sm font-bold text-white">Tags</h4>
							<p class="text-xs text-slate-400">Current tags: {(ugc.tags || []).join(", ") || "none"}</p>
							<button
								onclick={() => { onClose(); onOpenTags(ugc); }}
								class="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg text-xs font-bold transition-all"
							>
								<Tag class="w-4 h-4" /> Edit Tags
							</button>
						</div>
					</div>
				{:else}
					<!-- Raw Data -->
					<pre class="text-xs font-mono text-slate-300 bg-slate-950 rounded-xl p-4 overflow-x-auto max-h-[50vh] whitespace-pre-wrap break-all">{JSON.stringify(ugc, null, 2)}</pre>
				{/if}
			</div>

			<div class="p-5 border-t border-slate-800 flex justify-end">
				<button onclick={onClose} class="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-all">
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

{#snippet DetailField({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean })}
	<div>
		<label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
		<p class="text-sm text-white mt-1 {mono ? 'font-mono text-xs' : 'font-medium'}">{String(value)}</p>
	</div>
{/snippet}
