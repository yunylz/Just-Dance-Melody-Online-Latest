<script>
	import PageHeader from '$lib/components/Hub/Shared/PageHeader.svelte';
	import colors from "$lib/colors";
	import { Medal } from "lucide-svelte";
</script>

<PageHeader
	icon={Medal}
	gradient={colors.leaderboard}
	title="Leaderboards"
	description="Take a look at the top players in the world!"
/>