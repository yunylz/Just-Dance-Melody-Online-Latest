<script>
	import { tutorials, getPlatform } from './tutorials.js';

	/** @type {string} */
	export let activeTab;

	/** @type {(tab: string, section: string) => void} */
	export let onNavigate;
</script>

<div>
	<div class="page-header">
		<h1 class="page-title">Setup</h1>
		<p class="page-desc">Follow these steps to connect your <strong>{getPlatform(activeTab).title}</strong> to the JDMO servers.</p>
	</div>

	{#if tutorials[activeTab].info}
		<div class="alert alert-info">
			<svg class="alert-icon-svg" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<div>
				<p class="alert-label">Info</p>
				<p class="alert-text">{tutorials[activeTab].info}</p>
			</div>
		</div>
	{/if}

	<div class="steps-list">
		{#each tutorials[activeTab].steps as step, i}
			<div class="step-block">
				<div class="step-indicator">
					<div class="step-circle">{i + 1}</div>
					{#if i < tutorials[activeTab].steps.length - 1}
						<div class="step-line"></div>
					{/if}
				</div>
				<div class="step-content">
					<p class="step-title">
						{step.title}
						{#if step.note}
							<span class="note-inline">— {step.note}</span>
						{/if}
					</p>
					<div class="step-details">
						{#each step.details as detail}
							{#if detail.label}
								<div class="detail-row">
									{#if detail.url}
										<a href={detail.url} target="_blank" rel="noopener noreferrer" class="detail-link">{detail.label}</a>
									{:else}
										<span class="detail-label">{detail.label}</span>
										<code class="detail-value">{detail.value}</code>
									{/if}
								</div>
							{:else}
								<p class="detail-prose">{detail.value}</p>
							{/if}
						{/each}
					</div>
				</div>
			</div>
		{/each}
	</div>

	{#if tutorials[activeTab].notes.length}
		<div class="notes-card">
			<p class="notes-heading">Notes</p>
			<ul class="notes-list">
				{#each tutorials[activeTab].notes as note}
					<li><span class="note-dash">–</span>{note}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="page-nav-row">
		<button class="back-btn" on:click={() => onNavigate(activeTab, 'prerequisites')}>
			<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
			Prerequisites
		</button>
		<!-- <button class="next-btn" on:click={() => onNavigate(activeTab, 'introduction')}>
			Complete!
			<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
			</svg>
		</button> -->
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

	.alert {
		display: flex; gap: 0.75rem; align-items: flex-start;
		padding: 0.85rem 1rem;
		border-radius: 0.75rem;
		margin-bottom: 0.75rem;
	}
	.alert-info {
		background: rgba(226, 92, 246, 0.06);
		border: 1px solid rgba(246, 92, 238, 0.15);
	}
	.alert-icon-svg { flex-shrink: 0; margin-top: 0.15rem; color: #fa8bfa; }
	.alert-label { font-weight: 700; font-size: 0.78rem; margin: 0 0 0.15rem; text-transform: uppercase; letter-spacing: 0.05em; color: #fa8bf8; }
	.alert-text { font-size: 0.825rem; line-height: 1.55; margin: 0; color: rgba(253, 181, 249, 0.85); }

	.steps-list { display: flex; flex-direction: column; gap: 0; margin-bottom: 1.5rem; }
	.step-block { display: flex; gap: 1rem; }
	.step-indicator {
		display: flex; flex-direction: column; align-items: center;
		flex-shrink: 0;
	}
	.step-circle {
		width: 2rem; height: 2rem;
		background: linear-gradient(135deg, #f84eef, #cb26b7);
		border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		font-size: 0.8rem; font-weight: 700; color: #fff;
		flex-shrink: 0;
		box-shadow: 0 0 12px rgba(139,92,246,0.3);
	}
	.step-line {
		width: 1px; flex: 1;
		background: linear-gradient(to bottom, rgba(246, 92, 246, 0.4), rgba(246, 92, 246, 0.1));
		margin: 0.35rem 0;
		min-height: 1.5rem;
	}
	.step-content { flex: 1; padding-bottom: 1.75rem; }
	.step-title {
		font-size: 0.95rem; font-weight: 700;
		background: linear-gradient(to right, #f3f4f6, #e5e7eb);
		-webkit-background-clip: text; -webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0.25rem 0 0.75rem;
	}
	.note-inline { color: #fbbf24; font-size: 0.775rem; font-weight: 400; }
	.step-details { display: flex; flex-direction: column; gap: 0.4rem; }
	.detail-row { display: flex; gap: 0.75rem; align-items: baseline; font-size: 0.825rem; }
	.detail-label { color: #6b7280; min-width: 7rem; flex-shrink: 0; }
	.detail-link {
		color: #f88bfa;
		text-decoration: underline;
		font-size: 0.825rem;
		font-family: monospace;
		word-break: break-all;
		transition: color 0.2s;
	}
	.detail-link:hover { color: #c4b5fd; }
	.detail-value {
		background: rgba(246, 92, 244, 0.12);
		border: 1px solid rgba(241, 92, 246, 0.2);
		border-radius: 0.3rem;
		padding: 0.15rem 0.6rem;
		font-family: monospace;
		font-size: 0.825rem;
		color: #fdb5f9;
	}
	.detail-prose { color: #9ca3af; font-size: 0.825rem; line-height: 1.6; margin: 0; }

	.notes-card {
		background: rgba(241, 92, 246, 0.04);
		border: 1px solid rgba(244, 92, 246, 0.1);
		border-radius: 0.75rem;
		padding: 1rem 1.25rem;
		margin-bottom: 1.5rem;
	}
	.notes-heading {
		font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.08em;
		background: linear-gradient(to right, #ef8bfa, #f684fc);
		-webkit-background-clip: text; -webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0 0 0.65rem;
	}
	.notes-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.4rem; }
	.notes-list li { display: flex; gap: 0.6rem; font-size: 0.825rem; color: #9ca3af; line-height: 1.5; }
	.note-dash { color: #ed3ae1; flex-shrink: 0; }

	.page-nav-row { display: flex; justify-content: space-between; margin-top: 2rem; }
	.next-btn, .back-btn {
		display: inline-flex; align-items: center; gap: 0.45rem;
		padding: 0.6rem 1.3rem;
		border-radius: 0.6rem;
		font-size: 0.85rem; font-weight: 600;
		cursor: pointer; border: none;
		transition: all 0.25s ease;
	}
	.next-btn {
		background: linear-gradient(to right, #ed3aea, #f755f2);
		color: #fff;
	}
	.next-btn:hover {
		opacity: 0.9;
		transform: translateY(-1px);
		box-shadow: 0 4px 20px rgba(238, 92, 246, 0.35);
	}
	.back-btn {
		background: rgba(139,92,246,0.08);
		border: 1px solid rgba(139,92,246,0.15);
		color: #9ca3af;
	}
	.back-btn:hover { background: rgba(139,92,246,0.15); color: #e5e7eb; transform: translateY(-1px); }
</style>
