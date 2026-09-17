<script>
	import PageHeader from '$lib/components/Hub/Shared/PageHeader.svelte';
	import colors from "$lib/colors";
	import { Music } from "lucide-svelte";
</script>

<PageHeader
	icon={Music}
	gradient={colors.songs}
	title="Songs"
	description="Take a look at the list of songs available in Just Dance Melody Online!"
/>