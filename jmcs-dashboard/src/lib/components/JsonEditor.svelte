<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { EditorView, basicSetup } from "codemirror";
	import { json } from "@codemirror/lang-json";
	import { oneDark } from "@codemirror/theme-one-dark";
	import { Sparkles, AlertCircle } from "lucide-svelte";

	let { value = "", onchange = (val: string) => {}, onvalidate = (isValid: boolean) => {} } = $props();
	let container: HTMLDivElement | undefined = $state();
	let view: EditorView | undefined;
	let error: string | null = $state(null);

	function validate(val: string) {
		try {
			if (!val.trim()) {
				error = null;
				onvalidate(true);
				return true;
			}
			JSON.parse(val);
			error = null;
			onvalidate(true);
			return true;
		} catch (e: any) {
			error = e.message;
			onvalidate(false);
			return false;
		}
	}

	// Update view when value prop changes externally
	$effect(() => {
		if (view && value !== view.state.doc.toString()) {
			view.dispatch({
				changes: { from: 0, to: view.state.doc.length, insert: value },
			});
			validate(value);
		}
	});

	let isInitialMount = true;

	onMount(() => {
		if (!container) return;

		// Auto-beautify on initial load
		let displayValue = value;
		try {
			if (value && typeof value === "string") {
				const parsed = JSON.parse(value);
				displayValue = JSON.stringify(parsed, null, 2);
				// If it changed, we don't notify parent on mount to avoid false dirty state
				// The view will show the beautified version anyway.
			}
		} catch (e) {}

		validate(displayValue);
		isInitialMount = false;

		view = new EditorView({
			doc: displayValue,
			extensions: [
				basicSetup,
				json(),
				oneDark,
				EditorView.lineWrapping,
				EditorView.theme({
					"&": { height: "auto", minHeight: "60px", maxHeight: "400px" },
					".cm-scroller": { overflow: "auto" },
					".cm-content": {
						fontSize: "12px",
						fontFamily: "JetBrains Mono, Fira Code, monospace",
					},
				}),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						const newValue = update.state.doc.toString();
						validate(newValue);
						onchange(newValue);
					}
				}),
			],
			parent: container,
		});
	});

	onDestroy(() => {
		if (view) view.destroy();
		onvalidate(true); // Remove from error tracking on destroy
	});

	function beautify() {
		try {
			const current = view?.state.doc.toString() || value;
			const parsed = JSON.parse(current);
			const beautified = JSON.stringify(parsed, null, 2);
			if (view) {
				view.dispatch({
					changes: { from: 0, to: view.state.doc.length, insert: beautified },
				});
			} else {
				onchange(beautified);
			}
			error = null;
			onvalidate(true);
		} catch (e: any) {
			error = e.message;
			onvalidate(false);
		}
	}
</script>

<div class="relative group mt-1">
	<div
		bind:this={container}
		class="w-full max-w-full rounded-lg overflow-hidden border {error
			? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
			: 'border-slate-700'} bg-[#282c34] focus-within:border-indigo-500 transition-all"
	></div>

	{#if error}
		<div
			class="absolute bottom-0 left-0 right-0 bg-red-950/90 text-red-400 text-[10px] px-2 py-1 flex items-center gap-1.5 border-t border-red-500/50 backdrop-blur-sm z-10"
		>
			<AlertCircle class="w-3 h-3 flex-shrink-0" />
			<span class="truncate">{error}</span>
		</div>
	{/if}

	<button
		onclick={beautify}
		class="absolute top-2 right-2 p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-20 border border-slate-700 shadow-xl"
		title="Beautify JSON"
	>
		<Sparkles class="w-3.5 h-3.5" />
	</button>
</div>
