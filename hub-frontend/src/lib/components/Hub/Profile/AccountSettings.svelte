<script>
	import { createEventDispatcher, tick } from 'svelte';
	import { Shield, Check, Loader, Eye, EyeOff } from 'lucide-svelte';
	import { privacy } from '$lib/stores/privacy';
	import API from '$lib/api';
	import { fade } from 'svelte/transition';

	const dispatch = createEventDispatcher();

	export let userData;
	export let saving;
	export let message;
	export let errorMessage;
	export let onSaveProfile;

	let email = userData.email || '';
	let birthdate = userData.dateOfBirth ? userData.dateOfBirth.split('T')[0] : '';
	let showPasswordModal = false;
	let currentPassword = '';
	let newPassword = '';
	let confirmPassword = '';
	let passwordModalMessage = '';
	let passwordModalError = '';
	let isProcessingPassword = false;
	let isFadingModal = false;

	$: passwordRequirements = {
		length: newPassword.length >= 8 && newPassword.length <= 32,
		lowercase: /[a-z]/.test(newPassword),
		uppercase: /[A-Z]/.test(newPassword),
		digit: /\d/.test(newPassword),
		special: /[!@#$%^&*]/.test(newPassword)
	};

	$: passwordStrength = Object.values(passwordRequirements).every(Boolean) ? 'Strong' : 'Weak';
	$: passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
	$: isPasswordValid =
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,32}$/.test(newPassword);

	function portal(node) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}

	async function openPasswordModal() {
		showPasswordModal = true;
		currentPassword = '';
		newPassword = '';
		confirmPassword = '';
		passwordModalMessage = '';
		passwordModalError = '';
	}

	async function closePasswordModal() {
		isFadingModal = true;
		await tick();
		await new Promise((resolve) => setTimeout(resolve, 300));
		showPasswordModal = false;
		isFadingModal = false;
	}

	async function changePassword() {
		if (!currentPassword || !newPassword || !confirmPassword) {
			passwordModalError = 'Please fill in all password fields';
			return;
		}
		if (!passwordsMatch) {
			passwordModalError = 'New passwords do not match';
			return;
		}
		if (!isPasswordValid) {
			passwordModalError = 'New password does not meet requirements';
			return;
		}
		isProcessingPassword = true;
		try {
			await API.changePassword(currentPassword, newPassword);
			passwordModalMessage = 'Password changed successfully';
			isProcessingPassword = false;
			setTimeout(closePasswordModal, 1500);
		} catch (error) {
			passwordModalError = error.message || 'Failed to change password';
			isProcessingPassword = false;
		}
	}
</script>

<div class="as-card bg-gray-800/50">
	<div class="as-card-header">
		<span class="as-card-title">Account Settings</span>
		<span class="as-card-sub">Email, birthdate &amp; password</span>
	</div>

	<div class="as-fields">
		<!-- Email -->
		<div class="as-field">
			<label class="as-label" for="as-email">Email Address</label>
			<div class="as-input-wrap">
				<input
					id="as-email"
					type="email"
					bind:value={email}
					disabled={true}
					class="as-input"
					style={$privacy.showEmail ? '' : 'filter: blur(5px);'}
				/>
				<button
					class="as-eye"
					on:click={privacy.toggleEmail}
					type="button"
					aria-label="Toggle email visibility"
				>
					{#if $privacy.showEmail}<Eye size={15} />{:else}<EyeOff size={15} />{/if}
				</button>
			</div>
		</div>

		<!-- Birthdate -->
		{#if userData.dateOfBirth}
			<div class="as-field">
				<label class="as-label" for="as-birthdate">Birth Date</label>
				<div class="as-input-wrap">
					<input
						id="as-birthdate"
						type="date"
						bind:value={birthdate}
						disabled={true}
						class="as-input"
						style={$privacy.showBirthdate ? '' : 'filter: blur(5px);'}
					/>
					<button
						class="as-eye"
						on:click={privacy.toggleBirthdate}
						type="button"
						aria-label="Toggle birthdate visibility"
					>
						{#if $privacy.showBirthdate}<Eye size={15} />{:else}<EyeOff size={15} />{/if}
					</button>
				</div>
			</div>
		{/if}

		<!-- Change Password -->
		<button class="as-password-btn" type="button" on:click={openPasswordModal} disabled={saving}>
			<Shield size={14} />
			Change Password
		</button>
	</div>
</div>

<!-- Password Modal -->
{#if showPasswordModal}
	<div use:portal>
		<div
			class="as-modal-backdrop"
			class:as-fade-out={isFadingModal}
			role="dialog"
			aria-modal="true"
			aria-label="Change Password"
			transition:fade={{ duration: 250 }}
		>
			<div class="as-modal">
				<div class="as-modal-header">
					<h3 class="as-modal-title">Change Password</h3>
					<p class="as-modal-sub">Enter your current and new password to update</p>
				</div>

				<div class="as-modal-body">
					<!-- Current Password -->
					<div class="as-field">
						<label class="as-label" for="as-cur-pass">Current Password</label>
						<input
							id="as-cur-pass"
							type="password"
							placeholder="Enter current password"
							bind:value={currentPassword}
							class="as-input"
							disabled={isProcessingPassword}
						/>
					</div>

					<!-- New Password -->
					<div class="as-field">
						<label class="as-label" for="as-new-pass">New Password</label>
						<input
							id="as-new-pass"
							type="password"
							placeholder="Enter new password"
							bind:value={newPassword}
							class="as-input"
							disabled={isProcessingPassword}
						/>
						{#if newPassword}
							<p class="as-strength" class:as-strength--ok={passwordStrength === 'Strong'}>
								Strength: <strong>{passwordStrength}</strong>
							</p>
						{/if}
					</div>

					<!-- Confirm Password -->
					<div class="as-field">
						<label class="as-label" for="as-conf-pass">Confirm New Password</label>
						<input
							id="as-conf-pass"
							type="password"
							placeholder="Confirm new password"
							bind:value={confirmPassword}
							class="as-input"
							disabled={isProcessingPassword}
						/>
						{#if newPassword && confirmPassword}
							<p class="as-match" class:as-match--ok={passwordsMatch}>
								{passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
							</p>
						{/if}
					</div>

					<!-- Requirements -->
					<div class="as-reqs">
						<p class="as-reqs-title">Requirements</p>
						<ul class="as-reqs-list">
							{#each [[passwordRequirements.length, '8–32 characters'], [passwordRequirements.lowercase, 'One lowercase letter'], [passwordRequirements.uppercase, 'One uppercase letter'], [passwordRequirements.digit, 'One number'], [passwordRequirements.special, 'One special character (!@#$%^&*)']] as [met, label]}
								<li class="as-req" class:as-req--met={met}>{label}</li>
							{/each}
						</ul>
					</div>

					<!-- Feedback -->
					{#if passwordModalMessage}
						<p class="as-feedback as-feedback--ok">{passwordModalMessage}</p>
					{/if}
					{#if passwordModalError}
						<p class="as-feedback as-feedback--err">{passwordModalError}</p>
					{/if}
				</div>

				<div class="as-modal-footer">
					<button
						class="as-btn-cancel"
						type="button"
						on:click={closePasswordModal}
						disabled={isProcessingPassword}
					>
						Cancel
					</button>
					<button
						class="as-btn-confirm"
						type="button"
						on:click={changePassword}
						disabled={isProcessingPassword ||
							!currentPassword ||
							!newPassword ||
							!confirmPassword ||
							!passwordsMatch ||
							!isPasswordValid}
					>
						{#if isProcessingPassword}
							<Loader class="as-spin" size={14} />
							Changing…
						{:else}
							<Check size={14} />
							Change Password
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* ── Card ── */
	.as-card {
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 18px;
		padding: 1.5rem 1.5rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		backdrop-filter: blur(16px);
		transition: border-color 0.2s;
	}

	.as-card-header {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
	}
	.as-card-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.92);
		letter-spacing: -0.01em;
	}
	.as-card-sub {
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.38);
	}

	/* ── Fields ── */
	.as-fields {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}
	.as-field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.as-label {
		font-size: 0.68rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.45);
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}
	.as-input-wrap {
		position: relative;
	}
	.as-input {
		width: 100%;
		box-sizing: border-box;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		padding: 0.55rem 2.4rem 0.55rem 0.8rem;
		font-size: 0.85rem;
		color: #fff;
		outline: none;
		transition:
			border-color 0.2s,
			background 0.2s,
			filter 0.3s;
	}
	.as-input::placeholder {
		color: rgba(255, 255, 255, 0.25);
	}
	.as-input:focus {
		border-color: rgba(168, 85, 247, 0.55);
		background: rgba(255, 255, 255, 0.07);
	}
	.as-input:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
	.as-eye {
		position: absolute;
		right: 0.65rem;
		top: 50%;
		transform: translateY(-50%);
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.35);
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		transition: color 0.2s;
	}
	.as-eye:hover {
		color: #c084fc;
	}

	/* Password button */
	.as-password-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		margin-top: 0.2rem;
		padding: 0.6rem 1rem;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 999px;
		font-size: 0.82rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.65);
		cursor: pointer;
		transition:
			border-color 0.2s,
			color 0.2s,
			background 0.2s;
	}
	.as-password-btn:hover:not(:disabled) {
		border-color: rgba(168, 85, 247, 0.5);
		color: #c084fc;
		background: rgba(168, 85, 247, 0.06);
	}
	.as-password-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	/* ── Strength / match hints ── */
	.as-strength {
		font-size: 0.72rem;
		color: rgba(239, 68, 68, 0.85);
		margin: 0;
		transition: color 0.2s;
	}
	.as-strength--ok {
		color: rgba(74, 222, 128, 0.9);
	}
	.as-match {
		font-size: 0.72rem;
		color: rgba(239, 68, 68, 0.85);
		margin: 0;
	}
	.as-match--ok {
		color: rgba(74, 222, 128, 0.9);
	}

	/* ── Requirements ── */
	.as-reqs {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 10px;
		padding: 0.75rem 0.9rem;
	}
	.as-reqs-title {
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: rgba(255, 255, 255, 0.4);
		margin: 0 0 0.4rem;
	}
	.as-reqs-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.as-req {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.35);
		padding-left: 1rem;
		position: relative;
		transition: color 0.2s;
	}
	.as-req::before {
		content: '✗';
		position: absolute;
		left: 0;
		color: rgba(239, 68, 68, 0.6);
	}
	.as-req--met {
		color: rgba(74, 222, 128, 0.85);
	}
	.as-req--met::before {
		content: '✓';
		color: rgba(74, 222, 128, 0.8);
	}

	/* ── Feedback ── */
	.as-feedback {
		font-size: 0.78rem;
		text-align: center;
		padding: 0.45rem 0.75rem;
		border-radius: 8px;
		margin: 0;
	}
	.as-feedback--ok {
		background: rgba(74, 222, 128, 0.1);
		border: 1px solid rgba(74, 222, 128, 0.25);
		color: rgba(134, 239, 172, 0.95);
	}
	.as-feedback--err {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.25);
		color: rgba(252, 165, 165, 0.95);
	}

	/* ── Modal ── */
	.as-modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		transition: opacity 0.3s ease;
	}
	.as-fade-out {
		opacity: 0;
	}
	.as-modal {
		background: rgba(31, 41, 55, 0.95);
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 20px;
		width: 100%;
		max-width: 440px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
	}
	.as-modal-header {
		padding: 1.4rem 1.5rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
		flex-shrink: 0;
	}
	.as-modal-title {
		font-size: 1rem;
		font-weight: 700;
		color: #fff;
		margin: 0 0 0.15rem;
	}
	.as-modal-sub {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}
	.as-modal-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.1rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}
	.as-modal-body::-webkit-scrollbar {
		width: 4px;
	}
	.as-modal-body::-webkit-scrollbar-track {
		background: transparent;
	}
	.as-modal-body::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.15);
		border-radius: 2px;
	}
	.as-modal-footer {
		padding: 0.9rem 1.5rem 1.2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.07);
		display: flex;
		gap: 0.65rem;
		flex-shrink: 0;
	}
	.as-btn-cancel {
		flex: 1;
		padding: 0.6rem 1rem;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 999px;
		font-size: 0.83rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.55);
		cursor: pointer;
		transition:
			border-color 0.2s,
			color 0.2s;
	}
	.as-btn-cancel:hover:not(:disabled) {
		border-color: rgba(255, 255, 255, 0.3);
		color: #fff;
	}
	.as-btn-cancel:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.as-btn-confirm {
		flex: 1;
		padding: 0.6rem 1rem;
		background: linear-gradient(135deg, #a855f7, #ec4899);
		border: none;
		border-radius: 999px;
		font-size: 0.83rem;
		font-weight: 700;
		color: #fff;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		transition:
			opacity 0.2s,
			transform 0.15s,
			box-shadow 0.2s;
		box-shadow: 0 4px 18px rgba(168, 85, 247, 0.35);
	}
	.as-btn-confirm:hover:not(:disabled) {
		opacity: 0.9;
		transform: translateY(-1px);
		box-shadow: 0 6px 22px rgba(168, 85, 247, 0.5);
	}
	.as-btn-confirm:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	:global(.as-spin) {
		animation: as-rotate 0.8s linear infinite;
	}
	@keyframes as-rotate {
		to {
			transform: rotate(360deg);
		}
	}
</style>
