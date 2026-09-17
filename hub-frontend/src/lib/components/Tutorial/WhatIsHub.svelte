<script>
	import './tutorial.css';

	/** @type {(tab: string, section: string) => void} */
	export let onNavigate;
</script>

<div>
	<div class="page-header">
		<h1 class="page-title">What is JDMO Hub?</h1>
		<p class="page-desc">
			Everything you need to know about the <strong>Just Dance Melody Online</strong> platform.
		</p>
	</div>

	<div class="intro-card">
		<h2 class="intro-heading" id="toc-the-service">The Service</h2>
		<p class="intro-text">
			<strong>JDMO Hub</strong> is the central dashboard for all things JDMO. It's where you
			register your account, link your console, track your stats, browse the song catalogue,
			and interact with the community. Think of it as your command centre for the JDMO
			experience.
		</p>
	</div>

    <div class="intro-card">
		<h2 class="intro-heading" id="toc-is-it-required">Is it required?</h2>
		<p class="intro-text">
			<strong>JDMO Hub</strong> is required on all platforms except Nintendo Switch and PlayStation — where it's optional, but highly recommended. Without it, you'll play as a guest and <strong>lose access to online features like Leaderboards and Dancer of the Week.</strong>
		</p>
	</div>

	<div class="intro-card">
		<h2 class="intro-heading" id="toc-what-you-can-do">What you can do</h2>
		<ul class="intro-list">
			<li>Register and manage your JDMO account</li>
			<li>Link your console to the service</li>
			<li>Browse the full song library with 1500+ tracks</li>
			<li>View live World Dance Floor data and leaderboards</li>
			<li>Track your play stats and progress</li>
			<li>Stay up to date with the latest news</li>
		</ul>
	</div>

	<div class="intro-card">
		<h2 class="intro-heading" id="toc-getting-started">Getting Started</h2>
		<p class="intro-text">
			Ready to jump in? Head over to the <a href="/tutorial" class="intro-link">Introduction</a> page for a quick overview,
			or pick your platform from the sidebar to start the setup process.
		</p>
	</div>

	<div class="page-nav-row">
		<button class="back-btn" on:click={() => onNavigate('pc', 'introduction')}>
			<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
			Introduction
		</button>
		<button class="next-btn bg-brand-gradient" on:click={() => onNavigate('pc', 'compatibility')}>
			Compatibility
			<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	</div>
</div>

<style>
	.intro-link {
		color: #fa7af1;
		text-decoration: underline;
		transition: color 0.2s;
	}
	.intro-link:hover { color: #fa7af1; }
</style>
