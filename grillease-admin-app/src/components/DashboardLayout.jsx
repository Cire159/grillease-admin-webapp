// src/components/DashboardLayout.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { databases } from '../lib/appwrite';
import { ID } from 'appwrite';

// Components to be imported
import MenuManager from './MenuManager.jsx';
import OrderManager from './OrderManager.jsx';
import ReservationManager from './ReservationManager.jsx';
import DashboardStats from './DashboardStats.jsx';
import SalesManager from './SalesManager.jsx';
import UserManager from './UserManager.jsx';
import {
    AppBar, Toolbar, Typography, Button, Drawer, List, ListItem, ListItemText, ListItemIcon, Container, Box, IconButton, BottomNavigation, BottomNavigationAction, Chip, Button as MuiButton
} from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import EventIcon from '@mui/icons-material/Event';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import PeopleIcon from '@mui/icons-material/People';
import ChatIcon from '@mui/icons-material/Chat';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import NotificationBell from './NotificationBell.jsx';
import MessageManager from './MessageManager.jsx';
import { realtime } from '../lib/appwrite';
import Tooltip from '@mui/material/Tooltip';
import { useThemeMode } from '../context/ThemeModeContext.jsx';

const drawerWidth = 240;

const DashboardLayout = () => {
    console.log('🏠 DashboardLayout rendering');
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const { mode, setMode } = useThemeMode();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
    const [categories, setCategories] = useState([]);
    const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const CATEGORIES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_CATEGORIES_COLLECTION_ID;

    // Fetch categories on component mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await databases.listDocuments(DATABASE_ID, CATEGORIES_COLLECTION_ID);
                const docs = (response.documents || []).map(d => ({
                    $id: d.$id,
                    name: d.name || '',
                    color: d.color || '#2196F3',
                }));
                setCategories(docs);
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        const handler = (e) => {
            const detail = e?.detail || {};
            if (!detail.message) return;
            setToast({ open: true, message: detail.message, severity: detail.severity || 'info' });
        };
        window.addEventListener('app:toast', handler);
        const navHandler = (e) => {
            const detail = e?.detail || '';
            if (!detail) return;
            navigate(`/admin/dashboard/${detail}`);
        };
        window.addEventListener('navigate', navHandler);
        return () => {
            window.removeEventListener('app:toast', handler);
            window.removeEventListener('navigate', navHandler);
        };
    }, []);

    const handleCloseToast = () => setToast(t => ({ ...t, open: false }));

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    // Define nav items based on role
    const baseNavItems = [
        { name: 'Menu Management', path: '/admin/dashboard/menu' },
        { name: 'Order Processing', path: '/admin/dashboard/orders' },
        { name: 'Reservations', path: '/admin/dashboard/reservations' },
    ];

    const superadminNavItems = [
        ...baseNavItems,
        { name: 'Sales Management', path: '/admin/dashboard/sales' },
        { name: 'History & Analytics', path: '/admin/dashboard/history' },
        { name: 'User Management', path: '/admin/dashboard/users' },
    ];

    const navItems = user?.role === 'superadmin' ? superadminNavItems : baseNavItems;

    const drawer = (
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ my: 2 }}>
                Grillease Admin
            </Typography>
            
            {/* Category Shortcuts Section */}
            {categories.length > 0 && (
                <>
                    <Box sx={{ px: 2, mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1, textAlign: 'left' }}>
                            Quick Category Selection
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <MuiButton
                                fullWidth
                                variant="outlined"
                                onClick={() => {
                                    // Navigate to menu page and set category to uncategorized
                                    navigate('/admin/dashboard/menu');
                                    // Dispatch event to set category in MenuManager
                                    window.dispatchEvent(new CustomEvent('set-category', { detail: '' }));
                                }}
                                sx={{
                                    fontSize: '0.875rem',
                                    textTransform: 'none',
                                    borderRadius: 2,
                                    py: 1,
                                    justifyContent: 'flex-start',
                                    color: 'text.primary',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    '&:hover': {
                                        backgroundColor: 'rgba(0,0,0,0.04)',
                                    },
                                }}
                            >
                                Uncategorized
                            </MuiButton>
                            {categories.map((category) => (
                                <MuiButton
                                    key={category.$id}
                                    fullWidth
                                    variant="outlined"
                                    onClick={() => {
                                        // Navigate to menu page and set category
                                        navigate('/admin/dashboard/menu');
                                        // Dispatch event to set category in MenuManager
                                        window.dispatchEvent(new CustomEvent('set-category', { detail: category.name }));
                                    }}
                                    sx={{
                                        fontSize: '0.875rem',
                                        textTransform: 'none',
                                        borderRadius: 2,
                                        py: 1,
                                        justifyContent: 'flex-start',
                                        backgroundColor: 'transparent',
                                        color: 'text.primary',
                                        border: '1px solid',
                                        borderColor: category.color,
                                        '&:hover': {
                                            backgroundColor: 'rgba(0,0,0,0.04)',
                                        },
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box
                                            sx={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: '50%',
                                                backgroundColor: category.color,
                                                border: '1px solid rgba(0,0,0,0.2)',
                                            }}
                                        />
                                        {category.name}
                                    </Box>
                                </MuiButton>
                            ))}
                        </Box>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                </>
            )}

            <List>
                {navItems.map((item) => (
                    <ListItem button key={item.name} onClick={() => navigate(item.path)}>
                        <ListItemText primary={item.name} />
                    </ListItem>
                ))}
                <ListItem button onClick={() => { logout(); navigate('/admin/login'); }}>
                    <ListItemText primary="Logout" sx={{ color: 'error.main' }} />
                </ListItem>
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>

            {/* --- Header/AppBar --- */}
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    {/* Logo Space */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                            Grillease
                        </Typography>
                    </Box>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Admin Dashboard
                    </Typography>

                    {/* Notification bell */}
                    <NotificationBell />

                    {/* Realtime indicator */}
                    <Tooltip title={realtime ? 'Realtime enabled' : 'Using polling'}>
                        <Chip label={realtime ? 'Realtime' : 'Polling'} color={realtime ? 'success' : 'default'} size="small" sx={{ ml: 1, mr: 1 }} />
                    </Tooltip>

                    {/* Theme toggle */}
                    <IconButton
                        sx={{ ml: 1 }}
                        color="inherit"
                        onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
                    >
                        {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
                    </IconButton>

                    <Button
                        color="inherit"
                        startIcon={<LogoutIcon />}
                        onClick={() => { logout(); navigate('/admin/login'); }}
                        sx={{ display: { xs: 'none', sm: 'flex' } }}
                    >
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            {/* --- Sidebar/Drawer --- */}
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            >
                {/* Mobile Drawer */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
                {/* Desktop Drawer */}
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>

            {/* --- Main Content Area --- */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    mt: 8 // Space for the fixed AppBar
                }}
            >
                {console.log('🏠 Rendering main content')}
                <Container maxWidth="lg">
                    <Routes>
                        {/* Default path (homepage of the dashboard) */}
                        <Route path="/" element={<DashboardStats />} />

                        {/* The core management views */}
                        <Route path="/menu" element={<MenuManager />} />
                        <Route path="/orders" element={<OrderManager />} />
                        <Route path="/reservations" element={<ReservationManager />} />

                        <Route path="/sales" element={<SalesManager />} />
                        <Route path="/users" element={<UserManager />} />
                        <Route path="/messages" element={<MessageManager />} />
                    </Routes>
                </Container>
            </Box>

            {/* Bottom navigation for small screens */}
            {/** Show only on xs/small screens */}
            <MobileBottomNav navigate={navigate} />
            <Snackbar open={toast.open} autoHideDuration={4000} onClose={handleCloseToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <MuiAlert elevation={6} variant="filled" onClose={handleCloseToast} severity={toast.severity}>{toast.message}</MuiAlert>
            </Snackbar>
        </Box>
    );
};

const MobileBottomNav = ({ navigate }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [value, setValue] = useState('/admin/dashboard');

    useEffect(() => {
        const handler = (e) => {
            if (!e?.detail) return;
            const detail = e.detail;
            if (detail === 'orders') navigate('/admin/dashboard/orders');
            if (detail === 'reservations') navigate('/admin/dashboard/reservations');
            if (detail === 'messages') navigate('/admin/dashboard/messages');
        };
        window.addEventListener('navigate', handler);
        return () => window.removeEventListener('navigate', handler);
    }, [navigate]);

    if (!isMobile) return null;

    return (
        <Box sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: (t) => t.zIndex.appBar }}>
            <BottomNavigation
                showLabels
                value={value}
                onChange={(event, newValue) => {
                    setValue(newValue);
                    navigate(newValue);
                }}
            >
                <BottomNavigationAction label="Stats" value="/admin/dashboard" icon={<MenuBookIcon />} />
                <BottomNavigationAction label="Orders" value="/admin/dashboard/orders" icon={<ShoppingCartIcon />} />
                <BottomNavigationAction label="Reservations" value="/admin/dashboard/reservations" icon={<EventIcon />} />

                <BottomNavigationAction label="Users" value="/admin/dashboard/users" icon={<PeopleIcon />} />
            </BottomNavigation>
        </Box>
    );
};

export default DashboardLayout;
