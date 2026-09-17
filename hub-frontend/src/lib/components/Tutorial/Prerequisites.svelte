<script>
	import { tutorials, getPlatform } from './tutorials.js';

	/** @type {string} */
	export let activeTab;

	/** @type {(tab: string, section: string) => void} */
	export let onNavigate;
</script>

<div>
	<div class="page-header">
		<h1 class="page-title">Prerequisites</h1>
		<p class="page-desc">Before connecting your <strong>{getPlatform(activeTab).title}</strong> to JDMO, make sure you have everything below ready.</p>
	</div>

	<div class="prereq-list">
		{#each tutorials[activeTab].prerequisites as prereq, i}
			<div class="prereq-item">
				<div class="prereq-num">{i + 1}</div>
				<div class="prereq-body">
					<p class="prereq-title">
						{prereq.title}
						{#if prereq.note}
							<span class="note-inline">— {prereq.note}</span>
						{/if}
					</p>
					<p class="prereq-desc">
						{prereq.description}
						{#if prereq.link}
							{#if prereq.link.url === '#'}
								<button class="link-btn" on:click={() => onNavigate(activeTab, 'compatibility')}>{prereq.link.text}</button>
							{:else}
								<a href={prereq.link.url} target="_blank" rel="noopener noreferrer">{prereq.link.text}</a>
							{/if}
						{/if}
					</p>
				</div>
			</div>
		{/each}
	</div>

	{#each tutorials[activeTab].dangers as danger}
		<div class="alert alert-danger">
			<svg class="alert-icon-svg" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
			</svg>
			<div>
				<p class="alert-label">Warning</p>
				<p class="alert-text">{danger}</p>
			</div>
		</div>
	{/each}

	<div class="next-btn-wrap">
		<button class="next-btn bg-brand-gradient-bkg" on:click={() => onNavigate(activeTab, 'setup')}>
			Continue to Setup
			<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	</div>
</div>

<style>
	.page-header { margin-bottom: 1.75rem; }
	.page-title {
		font-size: 2rem;
		font-weight: 800;
		background: linear-gradient(to right, #f9fafb, #e5e7eb);
		-webkit-background-clip: text; -webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0 0 0.5rem;
		line-height: 1.2;
	}
	.page-desc {
		color: #9ca3af;
		font-size: 0.95rem;
		line-height: 1.6;
		margin: 0;
	}
	.page-desc strong { color: #e5e7eb; font-weight: 600; }

	.prereq-list {
		display: flex; flex-direction: column; gap: 0.65rem;
		margin-bottom: 1.25rem;
	}
	.prereq-item {
		display: flex; gap: 0.85rem; align-items: flex-start;
		padding: 1rem 1.15rem;
		background: rgba(255,255,255,0.025);
		border: 1px solid rgba(139,92,246,0.08);
		border-radius: 0.75rem;
		transition: all 0.25s ease;
	}
	.prereq-item:hover {
		background: rgba(233, 92, 246, 0.05);
		border-color: rgba(228, 92, 246, 0.2);
		transform: translateX(4px);
	}
	.prereq-num {
		flex-shrink: 0;
		width: 1.6rem; height: 1.6rem;
		background: linear-gradient(135deg, rgba(226, 92, 246, 0.25), rgba(215, 85, 247, 0.2));
		border: 1px solid rgba(210, 92, 246, 0.3);
		border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		font-size: 0.75rem; font-weight: 700; color: #c4b5fd;
		margin-top: 0.1rem;
	}
	.prereq-body { flex: 1; min-width: 0; }
	.prereq-title { font-weight: 600; color: #f3f4f6; font-size: 0.875rem; margin: 0 0 0.2rem; }
	.prereq-desc { color: #9ca3af; font-size: 0.825rem; line-height: 1.55; margin: 0; }
	.prereq-desc a, .link-btn {
		color: #f88bfa; text-decoration: underline; margin-left: 0.2rem;
		background: none; border: none; cursor: pointer; padding: 0;
		font-size: inherit; font-family: inherit;
		transition: color 0.2s;
	}
	.prereq-desc a:hover, .link-btn:hover { color: #f8b5fd; }
	.note-inline { color: #fbbf24; font-size: 0.775rem; font-weight: 400; }

	.alert {
		display: flex; gap: 0.75rem; align-items: flex-start;
		padding: 0.85rem 1rem;
		border-radius: 0.75rem;
		margin-bottom: 0.75rem;
	}
	.alert-danger {
		background: rgba(239,68,68,0.06);
		border: 1px solid rgba(239,68,68,0.15);
	}
	.alert-icon-svg { flex-shrink: 0; margin-top: 0.15rem; color: #f87171; }
	.alert-label { font-weight: 700; font-size: 0.78rem; margin: 0 0 0.15rem; text-transform: uppercase; letter-spacing: 0.05em; color: #f87171; }
	.alert-text { font-size: 0.825rem; line-height: 1.55; margin: 0; color: rgba(252,165,165,0.85); }

	.next-btn-wrap { margin-top: 1.5rem; display: flex; justify-content: flex-end; }
	.next-btn {
		display: inline-flex; align-items: center; gap: 0.45rem;
		padding: 0.6rem 1.3rem;
		border-radius: 0.6rem;
		font-size: 0.85rem; font-weight: 600;
		cursor: pointer; border: none;
		color: #fff;
		transition: all 0.25s ease;
	}
	.next-btn:hover {
		opacity: 0.9;
		transform: translateY(-1px);
		box-shadow: 0 4px 20px rgba(246, 92, 231, 0.35);
	}
</style>
