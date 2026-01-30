// src/api/adminApi.js
import axios from 'axios';

// The base URL for your secure API endpoints
const ADMIN_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.8:5000/api'; // Use environment variable or default to network IP

const adminApi = axios.create({
    baseURL: ADMIN_API_BASE_URL,
});

// Request interceptor to attach the token before every request
adminApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        // Attach the token as a Bearer token
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default adminApi;
