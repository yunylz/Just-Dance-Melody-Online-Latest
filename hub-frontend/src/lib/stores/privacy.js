import { writable } from 'svelte/store';

// Initialize privacy settings from localStorage or default to true
const createPrivacyStore = () => {
	const initialState = {
		showEmail: true,
		showBirthdate: true
	};

	// Load from localStorage if available
	if (typeof localStorage !== 'undefined') {
		const savedEmailPref = localStorage.getItem('showEmail');
		const savedBirthdatePref = localStorage.getItem('showBirthdate');
		if (savedEmailPref !== null) initialState.showEmail = JSON.parse(savedEmailPref);
		if (savedBirthdatePref !== null) initialState.showBirthdate = JSON.parse(savedBirthdatePref);
	}

	const { subscribe, update } = writable(initialState);

	return {
		subscribe,
		toggleEmail: () =>
			update((state) => {
				const newState = { ...state, showEmail: !state.showEmail };
				if (typeof localStorage !== 'undefined') {
					localStorage.setItem('showEmail', JSON.stringify(newState.showEmail));
				}
				return newState;
			}),
		toggleBirthdate: () =>
			update((state) => {
				const newState = { ...state, showBirthdate: !state.showBirthdate };
				if (typeof localStorage !== 'undefined') {
					localStorage.setItem('showBirthdate', JSON.stringify(newState.showBirthdate));
				}
				return newState;
			})
	};
};

export const privacy = createPrivacyStore();