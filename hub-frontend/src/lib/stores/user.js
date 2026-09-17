import { writable, derived } from 'svelte/store';

/**
 * @typedef {Object} User
 * @property {string} userId - Unique user identifier
 * @property {string} username - User's chosen username
 * @property {string} email - User's email address
 * @property {string|null} country - User's country code (e.g., 'US')
 * @property {string|null} dateOfBirth - User's date of birth
 * @property {string|null} firstName - User's first name
 * @property {string|null} lastName - User's last name
 * @property {string|null} gender - User's gender
 * @property {string} preferredLanguage - User's preferred language (e.g., 'en')
 * @property {string} accountType - Account type (e.g., 'Hub')
 * @property {string} ageGroup - Age group (e.g., 'adult')
 * @property {string} dateCreated - Account creation date
 * @property {string} avatar - URL to the user's avatar image
 * @property {number} notifications - Number of unread notifications
 * @property {boolean} isOnline - Whether the user is currently online
 * @property {string} lastSeen - ISO timestamp of when the user was last active
 */

/**
 * Writable store for user data
 * @type {import('svelte/store').Writable<User | null>}
 */
export const user = writable(null);

/**
 * Derived store to check if user is logged in
 * @type {import('svelte/store').Readable<boolean>}
 */
export const isLoggedIn = derived(user, $user => !!$user);

/**
 * Logs in a user by setting user data
 * @param {User} newUser - The user object to set
 */
export const login = (newUser) => {
	user.set({ ...newUser, notifications: newUser.notifications || 0 });
};

/**
 * Logs out the user by clearing user data
 */
export const logout = () => {
	user.set(null);
	localStorage.removeItem('authToken');
};

/**
 * Increments the notification count
 */
export const addNotification = () => {
	user.update(u => (u ? { ...u, notifications: (u.notifications || 0) + 1 } : u));
};

/**
 * Clears all notifications
 */
export const clearNotifications = () => {
	user.update(u => (u ? { ...u, notifications: 0 } : u));
};