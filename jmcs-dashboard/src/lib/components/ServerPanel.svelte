<script lang="ts">
	import { ENVS, SERVERS, currentEnv, triggerRefresh } from "$lib/jmcs";
	import {
		Server,
		X,
		Check,
		RefreshCw,
		Globe,
		Shield,
		Laptop,
	} from "lucide-svelte";
	import { fade, slide, fly } from "svelte/transition";

	let { isOpen = $bindable(false) } = $props();

	function selectEnv(env: (typeof ENVS)[number]) {
		currentEnv.set(env);
		triggerRefresh();
	}

	const envIcons = {
		PROD: Shield,
		DEV: Globe,
		LOCAL: Laptop,
	};

	const envColors = {
		PROD: "text-red-400 bg-red-400/10 border-red-500/50",
		DEV: "text-blue-400 bg-blue-400/10 border-blue-500/50",
		LOCAL: "text-slate-400 bg-slate-400/10 border-slate-500/50",
	};
</script>

{#if isOpen}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		transition:fade={{ duration: 200 }}
		class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
		onclick={() => (isOpen = false)}
	></div>

	<!-- Panel -->
	<aside
		transition:fly={{ x: 400, duration: 300, opacity: 1 }}
		class="fixed right-0 top-0 z-50 flex h-screen w-80 flex-col border-l border-slate-800 bg-slate-900 shadow-2xl"
	>
		<div
			class="flex h-16 items-center justify-between border-b border-slate-800 px-6"
		>
			<div class="flex items-center gap-2">
				<Server class="h-5 w-5 text-indigo-400" />
				<h2 class="text-lg font-semibold text-white">Environments</h2>
			</div>
			<button
				onclick={() => (isOpen = false)}
				class="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
			>
				<X class="h-5 w-5" />
			</button>
		</div>

		<div class="flex-1 overflow-y-auto p-4 space-y-4">
			<p
				class="px-2 text-xs font-medium uppercase tracking-wider text-slate-500"
			>
				Select Active Server
			</p>

			<div class="space-y-2">
				{#each ENVS as env}
					{@const Icon = envIcons[env]}
					<button
						onclick={() => selectEnv(env)}
						class="group relative w-full overflow-hidden rounded-xl border p-4 text-left transition-all duration-200
						{$currentEnv === env
							? 'border-indigo-500 bg-indigo-500/10'
							: 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800'}"
					>
						{#if $currentEnv === env}
							<div
								class="absolute right-0 top-0 h-8 w-8 translate-x-4 -translate-y-4 rotate-45 bg-indigo-500"
							></div>
							<Check
								class="absolute right-1 top-1 h-3 w-3 text-white"
							/>
						{/if}

						<div class="flex items-start gap-4">
							<div class="rounded-lg p-2 {envColors[env]}">
								<Icon class="h-5 w-5" />
							</div>
							<div>
								<h3
									class="font-bold {$currentEnv === env
										? 'text-white'
										: 'text-slate-200'}"
								>
									{env}
								</h3>
								<p
									class="mt-0.5 font-mono text-[10px] text-slate-500 truncate w-40"
								>
									{SERVERS[env].FQDN || "Current Origin"}
								</p>
							</div>
						</div>
					</button>
				{/each}
			</div>

			<div
				class="mt-8 rounded-xl bg-slate-800/50 p-4 border border-slate-800"
			>
				<h4
					class="text-sm font-semibold text-white mb-2 flex items-center gap-2"
				>
					<RefreshCw class="h-4 w-4 text-indigo-400" />
					Auto-Refresh
				</h4>
				<p class="text-xs text-slate-400 leading-relaxed">
					Switching environments will update the API base URL for all
					subsequent requests. You may need to manually refresh
					current data.
				</p>
			</div>
		</div>

		<div class="p-4 border-t border-slate-800">
			<button
				onclick={() => window.location.reload()}
				class="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
			>
				<RefreshCw class="h-4 w-4" /> Full Page Reload
			</button>
		</div>
	</aside>
{/if}
