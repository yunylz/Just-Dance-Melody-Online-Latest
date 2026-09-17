<script>
    export let song;
    export let textClass = "text-xs";

    let classes = '';
    let label = '';

    $: {
        if (!song) {
            classes = '';
            label = '';
        } else if (song.isDLC) {
            classes = 'bg-blue-500/20 border-blue-400/30 text-blue-400';
            label = 'DLC';
        } else if (song.isNTSC || song.isPAL) {
            classes = 'bg-teal-500/20 border-teal-400/30 text-teal-400';
            label = song.isNTSC ? 'NTSC' : 'PAL';
        } else if (song.isMashup) {
            classes = 'bg-amber-500/20 border-amber-400/30 text-amber-400';
            label = 'Mashup';
        } else if (song.isAlternative) {
            classes = 'bg-purple-500/20 border-purple-400/30 text-purple-400';
            label = 'Alt';
        } else {
            classes = '';
            label = '';
        }
    }
</script>

{#if song && label}
<span class={`px-2 py-0.5 border rounded-lg ${textClass} ${classes} uppercase`}>
    {label}
</span>
{/if}