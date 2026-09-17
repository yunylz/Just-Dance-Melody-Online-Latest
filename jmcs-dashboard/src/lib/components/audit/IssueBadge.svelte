<script lang="ts">
	import {
		AlertTriangle,
		ShieldAlert,
		Package,
		ExternalLink,
		Gamepad,
	} from "lucide-svelte";

	let { issue } = $props();

	const issueTypeIcons: Record<string, any> = {
		missing_platform: Gamepad,
		missing_urls: ExternalLink,
		missing_skus: ShieldAlert,
		missing_packages: Package,
	};

	const issueTypeLabels: Record<string, string> = {
		missing_platform: "Missing Platform",
		missing_urls: "Missing URLs",
		missing_skus: "Missing SKUs",
		missing_packages: "Missing Packages",
	};

	const issueTypeColors: Record<string, string> = {
		missing_platform: "text-blue-400 bg-blue-400/10 border-blue-400/20",
		missing_urls: "text-orange-400 bg-orange-400/10 border-orange-400/20",
		missing_skus: "text-red-400 bg-red-400/10 border-red-400/20",
		missing_packages:
			"text-purple-400 bg-purple-400/10 border-purple-400/20",
	};

	const Icon = $derived(issueTypeIcons[issue.type] || AlertTriangle);
</script>

<div
	class="flex flex-col gap-1 p-2 rounded-lg border transition-all hover:scale-[1.02] {issueTypeColors[
		issue.type
	] || 'text-slate-400 bg-slate-400/10 border-slate-400/20'}"
>
	<div class="flex items-center gap-2">
		<Icon class="w-3.5 h-3.5" />
		<span class="text-[10px] font-bold uppercase tracking-wider">
			{issueTypeLabels[issue.type] || issue.type}
			{#if issue.platform}
				<span class="opacity-60 ml-1">({issue.platform})</span>
			{/if}
		</span>
	</div>
	<p class="text-xs opacity-90 leading-tight">{issue.message}</p>
</div>
