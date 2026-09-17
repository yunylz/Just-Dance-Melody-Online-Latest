<script lang="ts">
	import type { Component } from "svelte";

	interface Props {
		title: string;
		description?: string;
		icon?: Component<any>;
		children?: any;
		actions?: any;
	}

	let { title, description, icon: Icon, children, actions }: Props = $props();
</script>

<div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
	<div class="flex items-center gap-4">
		{#if Icon}
			<div class="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 shadow-inner shrink-0">
				<Icon class="w-6 h-6" />
			</div>
		{/if}
		<div>
			<h1 class="text-3xl font-black text-white tracking-tight leading-tight">
				{title}
			</h1>
			{#if description}
				<p class="text-slate-400 text-sm font-medium mt-0.5">
					{description}
				</p>
			{/if}
		</div>
	</div>

	<div class="flex items-center gap-3">
		{#if children}
			{@render children()}
		{/if}
		{#if actions}
			{@render actions()}
		{/if}
	</div>
</div>
