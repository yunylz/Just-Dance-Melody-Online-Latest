<section class="hero">
	<div class="hero-bg">
		<img src="/splash_bg.jpg" alt="" class="hero-img" />
		<div class="hero-overlay"></div>
	</div>
	<div class="hero-content">
		<h1 class="hero-title">Getting Started</h1>
		<div class="hero-divider"></div>
		<p class="hero-sub">
			Connect to <span class="gradient-text">Just Dance Melody Online</span> and start dancing.
		</p>
	</div>
</section>

<style>
	.hero {
		position: relative;
		width: 100%;
		min-height: 50vh;
		overflow: hidden;
		margin-top: -5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.hero-bg {
		position: absolute;
		inset: 0;
	}
	.hero-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transform: scale(1.2);
	}
	.hero-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to right,
			rgba(59, 7, 100, 0.85) 0%,
			rgba(88, 28, 135, 0.55) 100%,
			transparent 100%
		);
	}
	.hero-content {
		position: relative;
		z-index: 10;
		text-align: center;
		padding: 6rem 1.5rem 2.5rem;
		display: block;
	}
	.hero-title {
		font-size: clamp(2.2rem, 5vw, 4rem);
		font-weight: 900;
		background: linear-gradient(to right, #f472b6, #c084fc);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0 0 0.6rem;
		line-height: 1.2;
	}
	.hero-divider {
		width: 12rem;
		height: 3px;
		background: linear-gradient(to right, #ec4899, #a855f7);
		border-radius: 999px;
		margin: 0 auto 1rem;
	}
	.hero-sub {
		color: #d1d5db;
		font-size: 1rem;
		max-width: 34rem;
		margin: 0 auto;
		line-height: 1.6;
	}
	.gradient-text {
		background: linear-gradient(to right, #f472b6, #c084fc);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		font-weight: 600;
	}
</style>
