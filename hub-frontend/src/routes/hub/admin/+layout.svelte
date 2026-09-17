<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/user';

	$: currentUser = $user;

	onMount(async () => {
		if (!currentUser?.status?.admin && !currentUser?.status?.moderator) {
			goto('/hub/not-admin');
			return;
		}

		// Proactive check: try to fetch something admin-only
		// Moderators might not be able to call getAdmins, so we check if they are admin first
		if (currentUser.status.admin) {
			try {
				await API.getAdmins();
			} catch (error) {
				if (error.code === 86) {
					goto('/hub/profile?setup2fa=true');
				}
			}
		} else if (currentUser.status.moderator && !currentUser.status.twoFactorEnabled) {
			// If moderator and we already know 2FA is off, redirect
			goto('/hub/profile?setup2fa=true');
		}
	});
</script>

<slot />
