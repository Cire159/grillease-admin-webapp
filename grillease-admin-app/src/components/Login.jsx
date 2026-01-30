// src/components/Login.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Container, Box, TextField, Button, Typography, Alert
} from '@mui/material';
import './Login.css'; // Import the new CSS file

const Login = () => {
    console.log('🎨 Login component rendering');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Container 
            component="main" 
            maxWidth="xs" 
            className="login-page-wrapper"
            sx={{ px: { xs: 2, sm: 3 } }}
        >
            <Box
                sx={{
                    marginTop: { xs: 4, sm: 8 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    p: { xs: 3, sm: 4 },
                    boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                    borderRadius: 2,
                    backgroundColor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Typography 
                    component="h1" 
                    variant="h5" 
                    sx={{ 
                        color: 'text.primary', 
                        fontWeight: 600, 
                        fontSize: { xs: '1.25rem', sm: '1.5rem' },
                        textAlign: 'center',
                        mb: 3,
                    }}
                >
                    Grillease Staff Login
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
                    {error && <Alert severity="error" sx={{ width: '100%', mb: 2, fontSize: { xs: '0.875rem', sm: '1rem' } }}>{error}</Alert>}
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Staff Email"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: { xs: '1rem', sm: '1rem' },
                                minHeight: { xs: 56, sm: 56 }, // Touch-friendly
                            },
                        }}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: { xs: '1rem', sm: '1rem' },
                                minHeight: { xs: 56, sm: 56 }, // Touch-friendly
                            },
                        }}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        color="primary"
                        sx={{ 
                            mt: 3, 
                            mb: 2, 
                            py: { xs: 1.75, sm: 1.5 },
                            minHeight: { xs: 52, sm: 48 }, // Touch-friendly
                            fontSize: { xs: '1rem', sm: '1.1rem' },
                            fontWeight: 'bold',
                        }}
                    >
                        Log In
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default Login;
