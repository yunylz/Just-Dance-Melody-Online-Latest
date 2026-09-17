<script>
	import API from '$lib/api.js';
	
	export let countryId = null;
	export let countryCode = null;
	
	// Get country data based on what prop is provided
	$: country = countryId 
		? API.getCountry(countryId) 
		: countryCode 
		? API.getCountryByCode(countryCode) 
		: null;
</script>

{#if country && country.flag && country.name}
	<div class="tooltip tooltip-top z-999999999" data-tip={country.name || "World"}>
		<img
			src={country.flag}
			alt="{country.name || 'World'} country flag"
			class="w-5 h-3 min-w-5 min-h-3"
		/>
	</div>
{:else}
	<!-- Fallback: show world emoji -->
	<div class="tooltip tooltip-top z-999999999" data-tip="World">
		<span class="text-lg">🌍</span>
	</div>
{/if}
