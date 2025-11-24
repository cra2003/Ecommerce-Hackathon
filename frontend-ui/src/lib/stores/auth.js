import { writable } from 'svelte/store';
import { registerUser, loginUser, refreshSession, logoutSession, fetchMe } from '$lib/utils/api.js';

export const accessToken = writable('');
export const isAuthed = writable(false);
export const profile = writable(null);

// Simple cookie helpers (non-HttpOnly since set on client)
function setCookie(name, value, days = 30) {
	if (typeof document === 'undefined') return;
	const date = new Date();
	date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
	const expires = `; expires=${date.toUTCString()}`;
	const secure = location.protocol === 'https:' ? '; Secure' : '';
	document.cookie = `${name}=${encodeURIComponent(value)}${expires}; Path=/; SameSite=Lax${secure}`;
}

function getCookie(name) {
	if (typeof document === 'undefined') return '';
	const nameEQ = name + '=';
	const parts = document.cookie.split(';');
	for (let i = 0; i < parts.length; i++) {
		let c = parts[i];
		while (c.charAt(0) === ' ') c = c.substring(1, c.length);
		if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
	}
	return '';
}

function deleteCookie(name) {
	if (typeof document === 'undefined') return;
	document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax`;
}

function setToken(token) {
	accessToken.set(token || '');
	isAuthed.set(Boolean(token));
	if (token) {
		setCookie('access_token', token);
	} else {
		deleteCookie('access_token');
	}
}

// Initialize token from cookie on module load (browser only)
if (typeof document !== 'undefined') {
	const existing = getCookie('access_token');
	if (existing) {
		accessToken.set(existing);
		isAuthed.set(true);
	}
}

export async function register(payload) {
	const res = await registerUser(payload);
	const token = res?.accessToken || '';
	setToken(token);
	// Load profile immediately after registration with the token we just got
	if (token) {
		try {
			await loadProfile(token);
		} catch (err) {
			console.error('[auth] Failed to load profile after register:', err);
		}
	}
	return res;
}

export async function login(payload) {
	const res = await loginUser(payload);
	const token = res?.accessToken || '';
	setToken(token);
	// Load profile immediately after login with the token we just got
	if (token) {
		try {
			await loadProfile(token);
		} catch (err) {
			console.error('[auth] Failed to load profile after login:', err);
		}
	}
	return res;
}

export async function tryRefresh() {
	try {
		const res = await refreshSession();
		const token = res?.accessToken || '';
		if (token) {
			setToken(token);
			return res;
		}
		setToken('');
		return null;
	} catch (err) {
		setToken('');
		throw err;
	}
}

export async function logout() {
	try {
		await logoutSession();
	} finally {
		setToken('');
		profile.set(null);
		if (typeof window !== 'undefined') {
			window.location.href = '/?logout=1';
		}
	}
}

export async function loadProfile(tokenOverride = null, minimal = false) {
	let tokenValue = tokenOverride;
	if (!tokenValue) {
		const unsub = accessToken.subscribe(v => (tokenValue = v));
		unsub();
	}
	if (!tokenValue) {
		console.warn('[auth] No access token available for loadProfile');
		return null;
	}
	try {
		const me = await fetchMe(tokenValue, minimal);
		if (me?.user) {
			if (minimal) {
				// For minimal mode, only update username fields, keep existing profile data
				let currentProfile = null;
				const unsub = profile.subscribe(p => {
					currentProfile = p;
				});
				unsub();
				// Merge minimal user data with existing profile if available
				profile.set(currentProfile ? { ...currentProfile, ...me.user } : me.user);
			} else {
				// Full profile update
				profile.set(me.user);
			}
			console.log('[auth] Profile loaded:', minimal ? 'minimal' : 'full', me.user);
			return me.user;
		}
	} catch (err) {
		console.error('[auth] Failed to load profile:', err);
	}
	return null;
}
