<script>
	import { fade } from 'svelte/transition';
	import API from '$lib/api.js';
	import { Check, X, AlertCircle, Eye, EyeOff } from 'lucide-svelte';
	import { isLoggedIn, login } from '$lib/stores/user';
	import { goto } from '$app/navigation';
	import { onMount, createEventDispatcher } from 'svelte';
	import countries from '$lib/countries.js';
	import CountryFlag from '$lib/components/CountryFlag.svelte';

	export let errorMessage;
	export let selectedAvatar = 1;
	export let isRegister;
	export let showForgot;

	const dispatch = createEventDispatcher();

	let regUsername = '';
	let regEmail = '';
	let regPassword = '';
	let regDateOfBirth = '';
	let regFirstName = '';
	let regLastName = '';
	let selectedCountry = null;
	let acceptTerms = false;
	let showVerificationModal = false;
	let isLoading = false;
	let showPassword = false;

	// Real-time validation states
	let validationErrors = {
		firstName: '',
		lastName: '',
		username: '',
		email: '',
		password: '',
		dateOfBirth: '',
		country: '',
		terms: ''
	};

	// Password requirements
	$: passwordRequirements = {
		length: regPassword.length >= 8 && regPassword.length <= 32,
		lowercase: /[a-z]/.test(regPassword),
		uppercase: /[A-Z]/.test(regPassword),
		digit: /\d/.test(regPassword),
		special: /[!@#$%^&*]/.test(regPassword)
	};

	$: passwordStrength = Object.values(passwordRequirements).every(Boolean) ? 'Strong' : 'Weak';

	function validateFirstName(value) {
		if (!value.trim()) return 'Required';
		if (value.length < 2) return 'Min 2 chars';
		if (value.length > 100) return 'Max 100 chars';
		return '';
	}
	function validateLastName(value) {
		if (!value.trim()) return 'Required';
		if (value.length < 2) return 'Min 2 chars';
		if (value.length > 100) return 'Max 100 chars';
		return '';
	}
	function validateUsername(value) {
		if (!value.trim()) return 'Required';
		if (value.length < 3) return 'Min 3 chars';
		if (value.length > 12) return 'Max 12 chars';
		if (!/^[a-zA-Z0-9]+$/.test(value)) return 'Letters & numbers only';
		return '';
	}
	function validateEmail(value) {
		if (!value.trim()) return 'Required';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email';
		return '';
	}
	function validatePassword(value) {
		if (!value) return 'Required';
		if (!passwordRequirements.length) return '8-32 characters';
		if (!passwordRequirements.lowercase) return 'Needs lowercase';
		if (!passwordRequirements.uppercase) return 'Needs uppercase';
		if (!passwordRequirements.digit) return 'Needs a number';
		if (!passwordRequirements.special) return 'Needs special char';
		return '';
	}
	function validateDateOfBirth(value) {
		if (!value) return 'Required';
		const [year, month, day] = value.split('-').map(Number);
		if (isNaN(day) || isNaN(month) || isNaN(year)) return 'Invalid date';
		if (year < 1900 || year > new Date().getFullYear()) return 'Invalid year';
		const date = new Date(year, month - 1, day);
		if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year)
			return 'Invalid date';
		const today = new Date();
		const age =
			today.getFullYear() -
			year -
			(today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)
				? 1
				: 0);
		if (age < 13) return 'Must be 13+';
		return '';
	}

	$: validationErrors.firstName = regFirstName ? validateFirstName(regFirstName) : '';
	$: validationErrors.lastName = regLastName ? validateLastName(regLastName) : '';
	$: validationErrors.username = regUsername ? validateUsername(regUsername) : '';
	$: validationErrors.email = regEmail ? validateEmail(regEmail) : '';
	$: validationErrors.password = regPassword ? validatePassword(regPassword) : '';
	$: validationErrors.dateOfBirth = regDateOfBirth ? validateDateOfBirth(regDateOfBirth) : '';

	$: isFormValid =
		regUsername.trim() !== '' &&
		regEmail.trim() !== '' &&
		regFirstName.trim() !== '' &&
		regLastName.trim() !== '' &&
		regPassword !== '' &&
		regDateOfBirth !== '' &&
		selectedCountry !== null &&
		acceptTerms &&
		!validationErrors.firstName &&
		!validationErrors.lastName &&
		!validationErrors.username &&
		!validationErrors.email &&
		!validationErrors.password &&
		!validationErrors.dateOfBirth;

	onMount(() => {
		if ($isLoggedIn) goto('/hub');
	});

	function handleBack() {
		dispatch('back');
	}

	function handleVerificationConfirmed() {
		isRegister = false;
		showForgot = false;
	}

	async function handleSubmit(e) {
		e.preventDefault();
		errorMessage = '';
		isLoading = true;

		const finalValidation = {
			firstName: validateFirstName(regFirstName),
			lastName: validateLastName(regLastName),
			username: validateUsername(regUsername),
			email: validateEmail(regEmail),
			password: validatePassword(regPassword),
			dateOfBirth: validateDateOfBirth(regDateOfBirth)
		};

		if (Object.values(finalValidation).some((e) => e !== '')) {
			validationErrors = { ...validationErrors, ...finalValidation };
			errorMessage = 'Please fix the errors below';
			isLoading = false;
			return;
		}
		if (!selectedCountry) {
			validationErrors.country = 'Select your country';
			errorMessage = 'Please select your country';
			isLoading = false;
			return;
		}
		if (!acceptTerms) {
			validationErrors.terms = 'Accept the terms to continue';
			errorMessage = 'You must accept the Terms of Use and Privacy Policy';
			isLoading = false;
			return;
		}

		try {
			const response = await API.register({
				username: regUsername,
				email: regEmail,
				password: regPassword,
				dateOfBirth: regDateOfBirth,
				firstName: regFirstName,
				lastName: regLastName,
				country: selectedCountry.code,
				acceptedTermsOfUse: acceptTerms,
				avatarId: selectedAvatar
			});

			if (response.emailVerificationSent) {
				isLoading = false;
				showVerificationModal = true;
				return;
			}

			localStorage.setItem('authToken', response.session.token);
			const userData = await API.getCurrentUser();
			if (!userData) throw new Error('Failed to fetch user data');

			login({
				userId: userData.userId,
				username: userData.username,
				email: userData.email,
				country: userData.country,
				dateOfBirth: userData.dateOfBirth,
				firstName: userData.firstName,
				lastName: userData.lastName,
				gender: userData.gender,
				preferredLanguage: userData.preferredLanguage,
				accountType: userData.accountType,
				ageGroup: userData.ageGroup,
				dateCreated: userData.dateCreated,
				avatar: API.getAvatarUrl(userData.avatarId || selectedAvatar),
				notifications: 0,
				status: userData.status || {},
				isAdmin: userData.status.admin == true || false
			});

			goto('/hub');
		} catch (err) {
			console.error(err);
			errorMessage =
				err.errorId === 'USERNAME_OR_EMAIL_USED'
					? 'This username or email is already in use.'
					: err.message || 'An error occurred during registration.';
		} finally {
			isLoading = false;
		}
	}

	function fieldClass(name, value) {
		const hasValue = value && value.toString().trim() !== '';
		if (validationErrors[name]) return 'rf-input rf-input--error';
		if (hasValue && !validationErrors[name]) return 'rf-input rf-input--ok';
		return 'rf-input';
	}
</script>

<!-- Outer wrapper fills flex space from parent -->
<div class="rf-outer" in:fade={{ duration: 250 }}>
	<!-- Preview strip (compact) -->
	<div class="rf-preview">
		<img src={API.getAvatarUrl(selectedAvatar)} alt="Avatar" class="rf-avatar" />
		<div class="rf-preview-info">
			<span class="rf-preview-name">{regUsername || 'Username'}</span>
			{#if selectedCountry}<CountryFlag countryId={selectedCountry.id} />{/if}
			<span class="rf-preview-fullname">{regFirstName || 'First'} {regLastName || 'Last'}</span>
		</div>
		<button type="button" class="rf-change-avatar" on:click={handleBack} disabled={isLoading}>
			← Change
		</button>
	</div>

	<!-- Scrollable form body -->
	<div class="rf-scroll">
		<form on:submit={handleSubmit} class="rf-form">
			<!-- Row: First + Last -->
			<div class="rf-grid-2">
				<div class="rf-field">
					<label class="rf-label" for="rf-fname">First Name</label>
					<input
						id="rf-fname"
						type="text"
						bind:value={regFirstName}
						placeholder="First"
						class={fieldClass('firstName', regFirstName)}
						disabled={isLoading}
						required
					/>
					{#if validationErrors.firstName}<span class="rf-err">{validationErrors.firstName}</span
						>{/if}
				</div>
				<div class="rf-field">
					<label class="rf-label" for="rf-lname">Last Name</label>
					<input
						id="rf-lname"
						type="text"
						bind:value={regLastName}
						placeholder="Last"
						class={fieldClass('lastName', regLastName)}
						disabled={isLoading}
						required
					/>
					{#if validationErrors.lastName}<span class="rf-err">{validationErrors.lastName}</span
						>{/if}
				</div>
			</div>

			<!-- Username -->
			<div class="rf-field">
				<label class="rf-label" for="rf-username"
					>Username <span class="rf-hint">3-12 chars, letters & numbers</span></label
				>
				<input
					id="rf-username"
					type="text"
					bind:value={regUsername}
					placeholder="CoolDancer42"
					class={fieldClass('username', regUsername)}
					disabled={isLoading}
					required
				/>
				{#if validationErrors.username}<span class="rf-err">{validationErrors.username}</span>{/if}
			</div>

			<!-- Email -->
			<div class="rf-field">
				<label class="rf-label" for="rf-email">Email</label>
				<input
					id="rf-email"
					type="email"
					bind:value={regEmail}
					placeholder="you@example.com"
					class={fieldClass('email', regEmail)}
					disabled={isLoading}
					required
				/>
				{#if validationErrors.email}<span class="rf-err">{validationErrors.email}</span>{/if}
			</div>

			<!-- Password -->
			<div class="rf-field">
				<label class="rf-label" for="rf-password">Password</label>
				<div class="rf-input-wrap">
					<input
						id="rf-password"
						type={showPassword ? 'text' : 'password'}
						bind:value={regPassword}
						placeholder="Strong password"
						class={fieldClass('password', regPassword)}
						disabled={isLoading}
						required
					/>
					<button
						type="button"
						class="rf-eye"
						on:click={() => (showPassword = !showPassword)}
						disabled={isLoading}
					>
						{#if showPassword}<EyeOff size={14} />{:else}<Eye size={14} />{/if}
					</button>
				</div>
				{#if validationErrors.password}<span class="rf-err">{validationErrors.password}</span>{/if}
				<!-- Password requirements pill row -->
				{#if regPassword}
					<div class="rf-req-row" in:fade={{ duration: 150 }}>
						{#each [{ key: 'length', label: '8-32' }, { key: 'lowercase', label: 'a-z' }, { key: 'uppercase', label: 'A-Z' }, { key: 'digit', label: '0-9' }, { key: 'special', label: '!@#' }] as req}
							<span
								class="rf-req-pill {passwordRequirements[req.key]
									? 'rf-req-pill--ok'
									: 'rf-req-pill--no'}"
							>
								{passwordRequirements[req.key] ? '✓' : '✗'}
								{req.label}
							</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Row: DOB + Country -->
			<div class="rf-grid-2">
				<div class="rf-field">
					<label class="rf-label" for="rf-dob">Date of Birth</label>
					<input
						id="rf-dob"
						type="date"
						bind:value={regDateOfBirth}
						class={fieldClass('dateOfBirth', regDateOfBirth)}
						disabled={isLoading}
						required
					/>
					{#if validationErrors.dateOfBirth}<span class="rf-err"
							>{validationErrors.dateOfBirth}</span
						>{/if}
				</div>
				<div class="rf-field">
					<label class="rf-label" for="rf-country">Country</label>
					<select
						id="rf-country"
						bind:value={selectedCountry}
						class={fieldClass('country', selectedCountry)}
						disabled={isLoading}
						required
					>
						<option value={null}>Select…</option>
						{#each countries as country}
							<option value={country}>{country.name}</option>
						{/each}
					</select>
					{#if validationErrors.country}<span class="rf-err">{validationErrors.country}</span>{/if}
				</div>
			</div>

			<!-- Terms -->
			<label class="rf-terms {validationErrors.terms ? 'rf-terms--error' : ''}">
				<input
					type="checkbox"
					bind:checked={acceptTerms}
					class="rf-checkbox"
					disabled={isLoading}
				/>
				<span
					>I agree to the <a href="/terms" class="rf-terms-link">Terms of Use</a> and
					<a href="/privacy" class="rf-terms-link">Privacy Policy</a></span
				>
			</label>

			<!-- Submit -->
			<button type="submit" class="rf-submit" disabled={!isFormValid || isLoading}>
				{#if isLoading}
					<svg class="rf-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						/>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
					Creating Account…
				{:else}
					Join the Dance!
				{/if}
			</button>
		</form>
	</div>
</div>

<!-- Verification modal -->
{#if showVerificationModal}
	<div class="rf-modal-overlay" in:fade={{ duration: 250 }}>
		<div class="rf-modal">
			<!-- Mail icon -->
			<div class="rf-modal-icon-wrap">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					class="rf-modal-icon-svg"
					xmlns="http://www.w3.org/2000/svg"
				>
					<rect
						x="2"
						y="4"
						width="20"
						height="16"
						rx="3"
						stroke="currentColor"
						stroke-width="1.5"
					/>
					<path
						d="M2 7l10 7 10-7"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				</svg>
			</div>
			<h2 class="rf-modal-title">Check Your Inbox</h2>
			<p class="rf-modal-label">Verification email sent to</p>
			<p class="rf-modal-email">{regEmail}</p>
			<p class="rf-modal-body">
				Click the link in the email to activate your account. Check your spam folder if you don't
				see it.
			</p>
			<button on:click={handleVerificationConfirmed} class="rf-modal-btn">
				I've Verified My Email
			</button>
		</div>
	</div>
{/if}

<style>
	/* Outer: fills available flex space */
	.rf-outer {
		flex: 1 1 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		backdrop-filter: blur(8px);
		overflow: hidden;
	}

	/* Preview strip */
	.rf-preview {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.65rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
	}
	.rf-avatar {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		border: 1.5px solid rgba(168, 85, 247, 0.5);
		object-fit: cover;
		flex-shrink: 0;
	}
	.rf-preview-info {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		min-width: 0;
	}
	.rf-preview-name {
		font-size: 0.82rem;
		font-weight: 700;
		color: #fff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.rf-preview-fullname {
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.4);
		white-space: nowrap;
	}
	.rf-change-avatar {
		flex-shrink: 0;
		font-size: 0.72rem;
		font-weight: 600;
		color: #c084fc;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: color 0.2s;
	}
	.rf-change-avatar:hover {
		color: #a855f7;
	}
	.rf-change-avatar:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Scrollable body */
	.rf-scroll {
		flex: 1 1 0;
		min-height: 0;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(139, 92, 246, 0.35) transparent;
	}
	.rf-scroll::-webkit-scrollbar {
		width: 4px;
	}
	.rf-scroll::-webkit-scrollbar-thumb {
		background: rgba(139, 92, 246, 0.35);
		border-radius: 4px;
	}

	.rf-form {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		padding: 0.85rem 1rem 0.85rem;
	}

	.rf-grid-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.rf-field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.rf-label {
		font-size: 0.68rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.45);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
	.rf-hint {
		font-weight: 400;
		color: rgba(255, 255, 255, 0.25);
		text-transform: none;
		letter-spacing: 0;
	}

	.rf-input-wrap {
		position: relative;
	}
	.rf-input-wrap .rf-input {
		padding-right: 2.2rem;
	}
	.rf-eye {
		position: absolute;
		right: 0.6rem;
		top: 50%;
		transform: translateY(-50%);
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.35);
		cursor: pointer;
		display: flex;
		align-items: center;
		padding: 0;
		transition: color 0.2s;
	}
	.rf-eye:hover {
		color: #c084fc;
	}

	.rf-input {
		width: 100%;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 9px;
		padding: 0.45rem 0.75rem;
		font-size: 0.82rem;
		color: #fff;
		outline: none;
		transition:
			border-color 0.2s,
			background 0.2s;
		box-sizing: border-box;
		-webkit-appearance: none;
	}
	.rf-input::placeholder {
		color: rgba(255, 255, 255, 0.25);
	}
	.rf-input:focus {
		border-color: rgba(168, 85, 247, 0.6);
		background: rgba(255, 255, 255, 0.09);
	}
	.rf-input:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.rf-input--error {
		border-color: rgba(239, 68, 68, 0.55) !important;
	}
	.rf-input--ok {
		border-color: rgba(74, 222, 128, 0.45) !important;
	}

	/* select styling */
	select.rf-input {
		cursor: pointer;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23ffffff50' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.6rem center;
		padding-right: 1.75rem;
	}
	select.rf-input option {
		background: #2d1b4e;
		color: #fff;
	}

	/* date input */
	input[type='date'].rf-input::-webkit-calendar-picker-indicator {
		filter: invert(0.6);
		cursor: pointer;
	}

	.rf-err {
		font-size: 0.68rem;
		color: #f87171;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	/* Password requirement pills */
	.rf-req-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-top: 0.15rem;
	}
	.rf-req-pill {
		font-size: 0.62rem;
		font-weight: 600;
		padding: 0.15rem 0.45rem;
		border-radius: 999px;
		letter-spacing: 0.03em;
	}
	.rf-req-pill--ok {
		background: rgba(74, 222, 128, 0.12);
		color: #4ade80;
		border: 1px solid rgba(74, 222, 128, 0.25);
	}
	.rf-req-pill--no {
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	/* Terms */
	.rf-terms {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		padding: 0.5rem 0.6rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 8px;
		transition: background 0.2s;
		line-height: 1.45;
	}
	.rf-terms:hover {
		background: rgba(255, 255, 255, 0.07);
	}
	.rf-terms--error {
		border-color: rgba(239, 68, 68, 0.4) !important;
	}
	.rf-checkbox {
		width: 13px;
		height: 13px;
		accent-color: #a855f7;
		cursor: pointer;
		flex-shrink: 0;
		margin-top: 1px;
	}
	.rf-terms-link {
		color: #c084fc;
		text-decoration: underline;
	}
	.rf-terms-link:hover {
		color: #a855f7;
	}

	/* Submit */
	.rf-submit {
		width: 100%;
		background: linear-gradient(135deg, #a855f7, #ec4899);
		border: none;
		border-radius: 999px;
		padding: 0.62rem 1rem;
		font-size: 0.88rem;
		font-weight: 700;
		color: #fff;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		transition:
			opacity 0.2s,
			transform 0.15s,
			box-shadow 0.2s;
		box-shadow: 0 4px 20px rgba(168, 85, 247, 0.35);
		margin-top: 0.1rem;
	}
	.rf-submit:hover:not(:disabled) {
		opacity: 0.88;
		transform: translateY(-1px);
		box-shadow: 0 6px 24px rgba(168, 85, 247, 0.5);
	}
	.rf-submit:active:not(:disabled) {
		transform: translateY(0);
	}
	.rf-submit:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.rf-spin {
		width: 15px;
		height: 15px;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Verification modal */
	.rf-modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
	}
	.rf-modal {
		background: rgba(15, 8, 30, 0.97);
		border: 1px solid rgba(168, 85, 247, 0.25);
		border-radius: 24px;
		padding: 2.25rem 2rem 1.75rem;
		max-width: 360px;
		width: 90%;
		text-align: center;
		box-shadow:
			0 24px 64px rgba(0, 0, 0, 0.6),
			0 0 0 1px rgba(168, 85, 247, 0.1);
	}
	.rf-modal-icon-wrap {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.15));
		border: 1.5px solid rgba(168, 85, 247, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 1.25rem;
		box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
	}
	.rf-modal-icon-svg {
		width: 26px;
		height: 26px;
		color: #c084fc;
	}
	.rf-modal-title {
		font-size: 1.2rem;
		font-weight: 800;
		color: #fff;
		margin: 0 0 0.6rem;
		letter-spacing: -0.01em;
	}
	.rf-modal-label {
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.35);
		text-transform: uppercase;
		letter-spacing: 0.07em;
		font-weight: 600;
		margin: 0 0 0.2rem;
	}
	.rf-modal-email {
		font-size: 0.9rem;
		color: #c084fc;
		font-weight: 700;
		margin: 0 0 0.85rem;
		word-break: break-all;
	}
	.rf-modal-body {
		font-size: 0.82rem;
		color: rgba(255, 255, 255, 0.5);
		line-height: 1.6;
		margin: 0 0 1.5rem;
	}
	.rf-modal-btn {
		width: 100%;
		background: linear-gradient(135deg, #a855f7, #ec4899);
		border: none;
		border-radius: 999px;
		padding: 0.7rem 1rem;
		font-size: 0.88rem;
		font-weight: 700;
		color: #fff;
		cursor: pointer;
		transition:
			opacity 0.2s,
			transform 0.15s;
		box-shadow: 0 4px 16px rgba(168, 85, 247, 0.35);
	}
	.rf-modal-btn:hover {
		opacity: 0.88;
		transform: translateY(-1px);
	}
</style>
