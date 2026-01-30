// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    console.log('🔐 ProtectedRoute check - loading:', loading, 'user:', user);

    if (loading) {
        // Show a simple loading state while checking token
        console.log('⏳ ProtectedRoute still loading...');
        return (
            <Box 
                sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    minHeight: '100vh',
                    backgroundColor: '#F5F7FA'
                }}
            >
                <CircularProgress />
            </Box>
        ); 
    }

    console.log('✅ ProtectedRoute loading complete');

    // If the user is not logged in, redirect them to the login page
    if (!user) {
        console.log('❌ No user found, redirecting to login');
        return <Navigate to="/admin/login" replace />;
    }

    // If logged in, render the child components (the actual dashboard)
    console.log('✅ User authenticated, showing dashboard');
    return children;
};

export default ProtectedRoute;
