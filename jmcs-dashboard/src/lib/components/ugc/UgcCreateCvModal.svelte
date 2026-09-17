<script lang="ts">
	import { Video, RefreshCw } from "lucide-svelte";

	interface CvFormData {
		title: string;
		text: string;
		time: number;
		fileName: string;
		mimetype: string;
	}

	interface Props {
		show: boolean;
		form: CvFormData;
		step: "form" | "upload";
		result: any;
		file: File | null;
		creating: boolean;
		uploading: boolean;
		uploadProgress: string;
		onClose: () => void;
		onFormChange: (form: CvFormData) => void;
		onFileChange: (file: File | null) => void;
		onCreate: () => void;
		onUpload: () => void;
	}

	let {
		show,
		form,
		step,
		result,
		file,
		creating,
		uploading,
		uploadProgress,
		onClose,
		onFormChange,
		onFileChange,
		onCreate,
		onUpload,
	}: Props = $props();

	function updateField(field: keyof CvFormData, value: any) {
		onFormChange({ ...form, [field]: value });
	}
</script>

{#if show}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg">
			<div class="p-5 border-b border-slate-800">
				<div class="flex items-center gap-3">
					<div class="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10 text-purple-400 text-xs font-black">
						{step === "form" ? "1" : "2"}
					</div>
					<div>
						<h3 class="text-lg font-bold text-white">Create Menu Video (CV)</h3>
						<p class="text-xs text-slate-400">{step === "form" ? "Step 1: Create UGC entry" : "Step 2: Upload video file"}</p>
					</div>
				</div>
			</div>

			{#if step === "form"}
				<div class="p-5 space-y-4">
					<div class="space-y-2">
						<label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Title</label>
						<input
							value={form.title}
							oninput={(e) => updateField("title", e.currentTarget.value)}
							type="text"
							placeholder="e.g. Season 3 Trailer"
							class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
						/>
					</div>
					<div class="space-y-2">
						<label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Text Description</label>
						<input
							value={form.text}
							oninput={(e) => updateField("text", e.currentTarget.value)}
							type="text"
							placeholder="e.g. Welcome screen"
							class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
						/>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filename</label>
							<input
								value={form.fileName}
								oninput={(e) => updateField("fileName", e.currentTarget.value)}
								type="text"
								placeholder="video.webm"
								class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 font-mono"
							/>
						</div>
						<div class="space-y-2">
							<label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mimetype</label>
							<input
								value={form.mimetype}
								oninput={(e) => updateField("mimetype", e.currentTarget.value)}
								type="text"
								placeholder="video/webm"
								class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 font-mono"
							/>
						</div>
					</div>
					<div class="space-y-2">
						<label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Timestamp (Unix)</label>
						<input
							value={form.time}
							oninput={(e) => updateField("time", Number(e.currentTarget.value))}
							type="number"
							class="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 font-mono"
						/>
						<p class="text-[10px] text-slate-600">{new Date(form.time * 1000).toLocaleString()}</p>
					</div>
				</div>
				<div class="p-5 border-t border-slate-800 flex justify-end gap-3">
					<button onclick={onClose} class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
					<button
						onclick={onCreate}
						disabled={creating || !form.title}
						class="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50"
					>
						{creating ? "Creating..." : "Create CV Entry"}
					</button>
				</div>
			{:else}
				<div class="p-5 space-y-4">
					{#if result?.ugcId}
						<div class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
							<p class="text-xs text-emerald-400 font-bold">UGC Created</p>
							<p class="text-xs text-slate-400 font-mono mt-1">{result.ugcId}</p>
						</div>
					{/if}

					<div class="space-y-2">
						<label class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Video File</label>
						<div
							class="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-500/50 transition-colors {file ? 'border-emerald-500/50 bg-emerald-500/5' : ''}"
							onclick={() => document.getElementById('cv-file-input')?.click()}
							onkeydown={(e) => e.key === 'Enter' && document.getElementById('cv-file-input')?.click()}
							role="button"
							tabindex="0"
						>
							{#if file}
								<p class="text-sm text-emerald-400 font-medium">{file.name}</p>
								<p class="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
							{:else}
								<Video class="w-8 h-8 text-slate-600 mx-auto mb-2" />
								<p class="text-sm text-slate-400">Click to select a video file</p>
								<p class="text-xs text-slate-600 mt-1">WebM, MP4 — Max 500MB</p>
							{/if}
						</div>
						<input
							id="cv-file-input"
							type="file"
							accept="video/*"
							class="hidden"
							onchange={(e) => {
								const input = e.currentTarget as HTMLInputElement;
								onFileChange(input.files?.[0] || null);
							}}
						/>
					</div>

					{#if uploadProgress}
						<div class="flex items-center gap-2 text-sm text-indigo-400">
							<RefreshCw class="w-4 h-4 animate-spin" />
							{uploadProgress}
						</div>
					{/if}
				</div>
				<div class="p-5 border-t border-slate-800 flex justify-end gap-3">
					<button onclick={onClose} class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Close</button>
					<button
						onclick={onUpload}
						disabled={uploading || !file}
						class="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50"
					>
						{uploading ? "Uploading..." : "Upload Video"}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
