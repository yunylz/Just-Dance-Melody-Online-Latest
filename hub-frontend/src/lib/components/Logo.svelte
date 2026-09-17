<script>
	export let size = 'xl';
	export let style = '';
	export let isHub = false;
</script>

<span
	class={`text-${size} font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent ${style}`}
>
	{isHub ? 'Just Dance Melody Hub' : 'Just Dance Melody Online'}
</span>
