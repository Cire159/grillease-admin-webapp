// src/api/authService.js
import { account } from '../lib/appwrite';
import { ID } from 'appwrite';

export const authService = {
    login: async (email, password) => {
        // Logout any existing session first
        try {
            if (typeof account.deleteSession === 'function') {
                await account.deleteSession('current');
            }
        } catch (e) {
            // Ignore if no session
        }

        // Prefer SDK method createEmailPasswordSession when available
        if (typeof account.createEmailPasswordSession === 'function') {
            return await account.createEmailPasswordSession(email, password);
        }

        // Fallback to REST endpoint
        const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://[APPWRITE_HOST]/v1';
        const project = import.meta.env.VITE_APPWRITE_PROJECT || '[YOUR_PROJECT_ID]';
        const res = await fetch(`${endpoint}/account/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Appwrite-Project': project,
            },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const t = await res.text();
            throw new Error(t || 'Failed to create session via REST');
        }
        return await res.json();
    },

    logout: async () => {
        // Support multiple SDK variants
        if (typeof account.deleteSession === 'function') {
            return await account.deleteSession('current');
        }

        if (typeof account.deleteSessions === 'function') {
            // some versions provide deleteSessions
            return await account.deleteSessions();
        }

        if (typeof account.createEmailSession === 'undefined' && typeof account.createSession === 'undefined') {
            throw new Error('Auth method not available on Appwrite SDK for logout');
        }
    },

    getCurrentUser: async () => {
        try {
            // newer SDKs use get() or getAccount()
            if (typeof account.get === 'function') return await account.get();
            if (typeof account.getAccount === 'function') return await account.getAccount();
            throw new Error('Account retrieval method not found on Appwrite SDK');
        } catch (error) {
            if (error.code === 401) {
                return null;
            }
            throw error;
        }
    },
};
