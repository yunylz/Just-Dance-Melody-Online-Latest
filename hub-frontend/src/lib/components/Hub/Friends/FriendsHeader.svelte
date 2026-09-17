<script>
	import PageHeader from '$lib/components/Hub/Shared/PageHeader.svelte';
	import colors from '$lib/colors';
	import { Users } from 'lucide-svelte';

	export let totalFriends = 0;
	export let pendingRequests = 0;
</script>

<PageHeader
	icon={Users}
	gradient={colors.users}
	title="Friends"
	description="Find friends, connect, and discover new players."
	stats={[
		{ label: 'Friends', value: totalFriends, color: 'text-blue-400' },
		{ label: 'Pending', value: pendingRequests, color: 'text-cyan-400' }
	]}
/>
