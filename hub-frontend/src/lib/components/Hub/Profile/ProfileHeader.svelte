<script>
	import PageHeader from '$lib/components/Hub/Shared/PageHeader.svelte';
	import colors from "$lib/colors";
	import { User } from "lucide-svelte";
</script>

<PageHeader
	icon={User}
	gradient={colors.profile}
	title="Profile"
	description="Manage your account and gaming connections"
/>