<script>
	import { popups, popupStore } from '$lib/stores/popup';
	import PopupItem from './PopupItem.svelte';
	import { flip } from 'svelte/animate';

	function handleRemove(event) {
		popupStore.remove(event.detail);
	}
</script>

<div
	class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col-reverse gap-3 items-center min-w-[320px] max-w-[90vw] pointer-events-none"
>
	{#each $popups as popup (popup.id)}
		<div animate:flip={{ duration: 300 }} class="pointer-events-auto">
			<PopupItem {...popup} on:remove={handleRemove} />
		</div>
	{/each}
</div>
