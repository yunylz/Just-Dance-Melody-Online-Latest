<script>
  import { onMount } from 'svelte';
  onMount(() => {
    location.href = 'https://discord.gg/jdmo';
  });
</script>

<!-- Instant redirect fallback -->
<svelte:head>
  <meta http-equiv="refresh" content="0; url=https://discord.gg/jdmo" />
</svelte:head>
