<script>
	import PageHeader from '$lib/components/Hub/Shared/PageHeader.svelte';
	import colors from '$lib/colors';
	import { Megaphone } from 'lucide-svelte';

	export let newsCount = 0;
	export let unreadCount = 0;
</script>

<PageHeader
	icon={Megaphone}
	gradient={colors.news}
	title="Updates"
	description="Latest community news and personal alerts."
	stats={[
		{ label: 'News', value: newsCount, color: 'text-rose-400' },
		{ label: 'Alerts', value: unreadCount, color: 'text-blue-400' }
	]}
/>
