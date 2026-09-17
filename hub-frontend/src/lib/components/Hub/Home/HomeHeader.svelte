<script>
	import PageHeader from '$lib/components/Hub/Shared/PageHeader.svelte';
	import { Home } from 'lucide-svelte';
	import colors from '$lib/colors';
</script>

<PageHeader
	icon={Home}
	gradient={colors.home}
	title="Home"
	description="Check out what's new."
/>
