<script>
	import PageHeader from '$lib/components/Hub/Shared/PageHeader.svelte';
	import colors from "$lib/colors";
	import { Spotlight } from "lucide-svelte";
	import Utils from "$lib/utils";

	export let totalPlayers;
	export let computedAt = null;

	$: lastUpdated = computedAt ? Utils.timeAgo(computedAt) : null;
</script>

<PageHeader
	icon={Spotlight}
	gradient={colors.spotlight}
	title="Spotlight"
	description="Celebrating our most outstanding players from around the world!"
	sparkles={true}
	stats={[
		{ label: 'Featured Players', value: totalPlayers, color: 'text-pink-400' },
		...(lastUpdated ? [{ label: 'Last Updated', value: lastUpdated, color: 'text-gray-400' }] : [])
	]}
/>