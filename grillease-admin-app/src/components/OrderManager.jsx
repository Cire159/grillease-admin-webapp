import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import { normalizeOrderDoc } from '../lib/schemaUtils';
import { databases, realtime } from '../lib/appwrite';
import {
    Button, Card, CardContent, Typography, Grid, Chip, Box, Alert,
    CircularProgress, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Divider, Stack, Select, MenuItem, Badge
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const ORDERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID;

const OrderManager = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [newOrderOpen, setNewOrderOpen] = useState(false);
    const [cart, setCart] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [serviceType, setServiceType] = useState('dine-in');
    const [submitting, setSubmitting] = useState(false);
    const { user } = useAuth();
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderDetailOpen, setOrderDetailOpen] = useState(false);

    useEffect(() => {
        fetchOrders();
        fetchMenuItems();
        // subscribe to realtime order events
        let unsubscribe;
        try {
            unsubscribe = realtime.subscribe(`databases.${DATABASE_ID}.collections.${ORDERS_COLLECTION_ID}.documents`, res => {
                try {
                    console.debug('Realtime event (orders):', res);
                    // attempt to create a friendly message from payload
                    let action = 'Orders updated';
                    let who = '';
                    try {
                        const ev = res?.events?.[0] || '';
                        if (ev.includes('create')) action = 'New order received';
                        else if (ev.includes('update')) action = 'Order updated';
                        const payload = res?.payload || res?.detail || res?.data || res;
                        const data = payload?.data || payload;
                        who = data?.customer_name || data?.customerName || data?.customer || data?.userId || '';
                    } catch (_) {}

                    fetchOrders();
                    setSnackbar(s => ({ ...s, open: true, message: who ? `${action} from ${who}` : action, severity: 'info' }));
                } catch (e) {
                    console.error('Realtime handler error:', e);
                }
            });
        } catch (e) {
            console.warn('Realtime subscribe failed (orders):', e);
        }

        return () => {
            try { if (typeof unsubscribe === 'function') unsubscribe(); } catch (_) {}
        };
    }, []);

        const openOrderDetail = (order) => {
            setSelectedOrder(order);
            setOrderDetailOpen(true);
        };

        const closeOrderDetail = () => {
            setOrderDetailOpen(false);
            setSelectedOrder(null);
        };

    const fetchMenuItems = async () => {
        try {
            const MENU_COLLECTION_ID = import.meta.env.VITE_APPWRITE_MENU_COLLECTION_ID;
            if (!MENU_COLLECTION_ID) return;
            const res = await databases.listDocuments(DATABASE_ID, MENU_COLLECTION_ID);
            setMenuItems(res.documents || []);
        } catch (err) {
            console.error('Error fetching menu items:', err);
        }
    };

    const fetchOrders = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION_ID);
            const docs = (response.documents || []).map(normalizeOrderDoc);
            setOrders(docs);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching orders:', err);
            if (err.code === 401) {
                logout();
                setError('Your session has expired. Please log in again.');
            } else {
                setError('Failed to fetch orders. Please check your connection and try again.');
            }
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (orderId, newStatus) => {
        try {
            await databases.updateDocument(DATABASE_ID, ORDERS_COLLECTION_ID, orderId, { status: newStatus });
            fetchOrders();
        } catch (err) {
            setError(`Failed to update order ${orderId}.`);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'New': return 'error';
            case 'Processing': return 'warning';
            case 'Completed': return 'success';
            case 'Cancelled': return 'default';
            default: return 'info';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'New': return <ShoppingCartIcon />;
            case 'Processing': return <HourglassEmptyIcon />;
            case 'Completed': return <CheckCircleIcon />;
            case 'Cancelled': return <CancelIcon />;
            default: return <ShoppingCartIcon />;
        }
    };

    const openNewOrder = () => {
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setServiceType('dine-in');
        setNewOrderOpen(true);
    };

    const addToCart = (item) => {
        setCart(prev => {
            const found = prev.find(p => p.itemId === item.$id);
            if (found) {
                return prev.map(p => p.itemId === item.$id ? { ...p, qty: p.qty + 1 } : p);
            }
            return [...prev, { itemId: item.$id, name: item.name, price: parseFloat(item.price || 0), qty: 1 }];
        });
    };

    const updateQty = (itemId, qty) => {
        setCart(prev => prev.map(p => p.itemId === itemId ? { ...p, qty: Math.max(0, qty) } : p).filter(p => p.qty > 0));
    };

    const removeFromCart = (itemId) => setCart(prev => prev.filter(p => p.itemId !== itemId));

    const cartTotal = () => cart.reduce((s, i) => s + i.price * i.qty, 0);

    const submitOrder = async () => {
        if (cart.length === 0) return setError('Cart is empty');
        setSubmitting(true);
        try {
            const orderPayload = {
                userId: user?.$id || null,
                customer_name: customerName,
                customer_phone: customerPhone,
                items: cart,
                total: cartTotal(),
                status: 'New',
                serviceType,
                createdAt: new Date().toISOString(),
            };

            await databases.createDocument(DATABASE_ID, ORDERS_COLLECTION_ID, undefined, orderPayload);
            setNewOrderOpen(false);
            fetchOrders();
            setSnackbar({ open: true, message: 'Order created', severity: 'success' });
        } catch (err) {
            console.error('Failed to create order:', err);
            setError('Failed to create order');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseSnackbar = () => setSnackbar(s => ({ ...s, open: false }));

    // Calculate statistics
    const stats = {
        total: orders.length,
        new: orders.filter(o => o.status === 'New').length,
        processing: orders.filter(o => o.status === 'Processing').length,
        completed: orders.filter(o => o.status === 'Completed').length,
        cancelled: orders.filter(o => o.status === 'Cancelled').length,
        totalRevenue: orders
            .filter(o => o.status === 'Completed')
            .reduce((sum, o) => sum + parseFloat(o.total || 0), 0),
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
                <CircularProgress size={60} sx={{ color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                    Loading orders...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ width: '100%' }}>
                <Box
                    sx={{
                        backgroundColor: 'background.paper',
                        borderRadius: 2,
                        p: 2.5,
                        mb: 3,
                        boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Typography
                        variant="h5"
                        sx={{
                            fontSize: { xs: '1.25rem', sm: '1.5rem' },
                            color: 'text.primary',
                            fontWeight: 600,
                            textAlign: 'center',
                        }}
                    >
                        Order Manager
                    </Typography>
                </Box>
                <Card
                    sx={{
                        p: 4,
                        textAlign: 'center',
                        borderRadius: 2,
                        backgroundColor: 'background.paper',
                        boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Alert
                        severity="error"
                        sx={{
                            mb: 3,
                            borderRadius: 2,
                            '& .MuiAlert-message': {
                                width: '100%',
                            },
                        }}
                        action={
                            <IconButton
                                aria-label="retry"
                                color="inherit"
                                size="small"
                                onClick={fetchOrders}
                            >
                                <RefreshIcon />
                            </IconButton>
                        }
                    >
                        {error}
                    </Alert>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<RefreshIcon />}
                        onClick={fetchOrders}
                        sx={{ mt: 2 }}
                    >
                        Retry Loading Orders
                    </Button>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                        Make sure the backend server is running and you're connected to the internet.
                    </Typography>
                </Card>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            {/* Header */}
            <Box
                sx={{
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    p: 2.5,
                    mb: 3,
                    boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
                <Typography
                    variant="h5"
                    sx={{
                        fontSize: { xs: '1.25rem', sm: '1.5rem' },
                        color: 'text.primary',
                        fontWeight: 600,
                    }}
                >
                    Order Manager ({stats.new} New)
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Button variant="contained" color="primary" onClick={openNewOrder} startIcon={<ShoppingCartIcon />}>
                        New Order
                    </Button>
                    <IconButton
                        onClick={fetchOrders}
                        sx={{
                            color: 'text.secondary',
                            '&:hover': {
                                backgroundColor: 'rgba(0,0,0,0.04)',
                            },
                        }}
                    >
                        <RefreshIcon />
                    </IconButton>
                </Stack>
            </Box>

            {/* Statistics Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={4} md={2.4}>
                    <Card
                        sx={{
                            borderRadius: 2,
                            p: 2,
                            textAlign: 'center',
                            backgroundColor: 'background.paper',
                            boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <ShoppingCartIcon sx={{ fontSize: 24, mb: 1, color: 'text.secondary' }} />
                        <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {stats.total}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            Total Orders
                        </Typography>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2.4}>
                    <Card
                        sx={{
                            borderRadius: 2,
                            p: 2,
                            textAlign: 'center',
                            backgroundColor: 'background.paper',
                            boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <ShoppingCartIcon sx={{ fontSize: 24, mb: 1, color: 'error.main' }} />
                        <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {stats.new}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            New Orders
                        </Typography>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2.4}>
                    <Card
                        sx={{
                            borderRadius: 2,
                            p: 2,
                            textAlign: 'center',
                            backgroundColor: 'background.paper',
                            boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <HourglassEmptyIcon sx={{ fontSize: 24, mb: 1, color: 'warning.main' }} />
                        <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {stats.processing}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            Processing
                        </Typography>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2.4}>
                    <Card
                        sx={{
                            borderRadius: 2,
                            p: 2,
                            textAlign: 'center',
                            backgroundColor: 'background.paper',
                            boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <CheckCircleIcon sx={{ fontSize: 24, mb: 1, color: 'success.main' }} />
                        <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {stats.completed}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            Completed
                        </Typography>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4} md={2.4}>
                    <Card
                        sx={{
                            borderRadius: 2,
                            p: 2,
                            textAlign: 'center',
                            backgroundColor: 'background.paper',
                            boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <TrendingUpIcon sx={{ fontSize: 24, mb: 1, color: 'text.secondary' }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            ₱{stats.totalRevenue.toFixed(2)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            Total Revenue
                        </Typography>
                    </Card>
                </Grid>
            </Grid>
            <Grid container spacing={2}>
                {/* New Order Dialog */}
                <Dialog open={newOrderOpen} onClose={() => setNewOrderOpen(false)} fullWidth maxWidth="md">
                    <DialogTitle>Create New Order</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={7}>
                                <Typography variant="subtitle1" sx={{ mb: 1 }}>Menu</Typography>
                                <Grid container spacing={1}>
                                    {menuItems.length === 0 && (
                                        <Grid item xs={12}><Typography color="text.secondary">No menu items available</Typography></Grid>
                                    )}
                                    {menuItems.map(mi => (
                                        <Grid item xs={6} sm={4} key={mi.$id}>
                                            <Card sx={{ p: 1 }}>
                                                <CardContent sx={{ p: 1 }}>
                                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{mi.name}</Typography>
                                                    <Typography variant="body2" color="text.secondary">₱{parseFloat(mi.price || 0).toFixed(2)}</Typography>
                                                    <Box sx={{ mt: 1 }}>
                                                        <Button size="small" variant="outlined" onClick={() => addToCart(mi)}>Add</Button>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Grid>
                            <Grid item xs={12} md={5}>
                                <Typography variant="subtitle1" sx={{ mb: 1 }}>Cart</Typography>
                                <Box sx={{ maxHeight: 320, overflow: 'auto', mb: 1 }}>
                                    {cart.length === 0 && <Typography color="text.secondary">Cart is empty</Typography>}
                                    {cart.map(ci => (
                                        <Box key={ci.itemId} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{ci.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">₱{ci.price.toFixed(2)}</Typography>
                                            </Box>
                                            <TextField type="number" size="small" value={ci.qty} onChange={(e) => updateQty(ci.itemId, parseInt(e.target.value || 0))} inputProps={{ min: 0 }} sx={{ width: 80 }} />
                                            <Button size="small" color="error" onClick={() => removeFromCart(ci.itemId)}>Remove</Button>
                                        </Box>
                                    ))}
                                </Box>

                                <Divider sx={{ my: 1 }} />

                                <TextField label="Customer Name" fullWidth size="small" value={customerName} onChange={(e) => setCustomerName(e.target.value)} sx={{ mb: 1 }} />
                                <TextField label="Customer Phone" fullWidth size="small" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} sx={{ mb: 1 }} />

                                <Select fullWidth size="small" value={serviceType} onChange={(e) => setServiceType(e.target.value)} sx={{ mb: 1 }}>
                                    <MenuItem value="dine-in">Dine-in</MenuItem>
                                    <MenuItem value="takeout">Takeout</MenuItem>
                                    <MenuItem value="delivery">Delivery</MenuItem>
                                </Select>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                                    <Typography variant="h6">Total</Typography>
                                    <Typography variant="h6">₱{cartTotal().toFixed(2)}</Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setNewOrderOpen(false)}>Cancel</Button>
                        <Button variant="contained" onClick={submitOrder} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Order'}</Button>
                    </DialogActions>
                </Dialog>
                {orders.map((order) => (
                    <Grid item xs={12} sm={6} md={4} key={order.$id}>
                        <Card
                            variant="outlined"
                            sx={{
                                height: '100%',
                                borderRadius: 3,
                                border: 'none',
                                boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
                                transition: 'all 0.3s ease-in-out',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0px 8px 24px rgba(0,0,0,0.15)',
                                },
                            }}
                        >
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography
                                    variant="h6"
                                    sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, mb: 1 }}
                                >
                                    Order #{order.$id}
                                </Typography>
                                <Chip
                                    label={order.status}
                                    color={getStatusColor(order.status)}
                                    sx={{ mb: 1.5, fontWeight: 'bold' }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{ mb: 0.5, fontSize: { xs: '0.875rem', sm: '0.875rem' } }}
                                >
                                    Customer: {order.customer_name || 'N/A'}
                                </Typography>
                                <Typography
                                    variant="body1"
                                    sx={{
                                        fontSize: { xs: '1.1rem', sm: '1.25rem' },
                                        fontWeight: 'bold',
                                        color: 'primary.main',
                                        mb: 2,
                                    }}
                                >
                                    Total: ₱{parseFloat(order.total || 0).toFixed(2)}
                                </Typography>

                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: { xs: 'column', sm: 'row' },
                                    gap: 1,
                                }}>
                                    {order.status === 'New' && (
                                        <Button
                                            variant="contained"
                                            color="warning"
                                            size="medium"
                                            onClick={() => handleStatusUpdate(order.$id, 'Processing')}
                                            sx={{
                                                minHeight: { xs: 44, sm: 36 },
                                                fontSize: { xs: '0.95rem', sm: '0.875rem' },
                                            }}
                                            fullWidth
                                        >
                                            Start Processing
                                        </Button>
                                    )}
                                    {order.status === 'Processing' && (
                                        <Button
                                            variant="contained"
                                            color="success"
                                            size="medium"
                                            onClick={() => handleStatusUpdate(order.$id, 'Completed')}
                                            sx={{
                                                minHeight: { xs: 44, sm: 36 },
                                                fontSize: { xs: '0.95rem', sm: '0.875rem' },
                                            }}
                                            fullWidth
                                        >
                                            Mark Complete
                                        </Button>
                                    )}
                                    {order.status !== 'Completed' && order.status !== 'Cancelled' && (
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            size="medium"
                                            sx={{
                                                minHeight: { xs: 44, sm: 36 },
                                                fontSize: { xs: '0.95rem', sm: '0.875rem' },
                                            }}
                                            onClick={() => handleStatusUpdate(order.$id, 'Cancelled')}
                                            fullWidth
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                    <Button
                                        variant="text"
                                        size="small"
                                        onClick={() => openOrderDetail(order)}
                                        sx={{ mt: 1 }}
                                    >
                                        Details
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
                {orders.length === 0 && (
                    <Grid item xs={12}>
                        <Card
                            sx={{
                                p: 6,
                                textAlign: 'center',
                                borderRadius: 2,
                                backgroundColor: 'background.paper',
                                boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                                border: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <ShoppingCartIcon sx={{ fontSize: 48, mb: 2, color: 'text.secondary' }} />
                            <Typography
                                variant="h5"
                                sx={{
                                    fontWeight: 600,
                                    mb: 1,
                                    color: 'text.primary',
                                }}
                            >
                                No Orders Yet
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}
                            >
                                When customers place orders, they will appear here. You can track and manage all orders from this dashboard.
                            </Typography>
                            <Button
                                variant="outlined"
                                color="primary"
                                startIcon={<RefreshIcon />}
                                onClick={fetchOrders}
                                sx={{ borderRadius: 2 }}
                            >
                                Refresh Orders
                            </Button>
                        </Card>
                    </Grid>
                )}
            </Grid>
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar}>
                <MuiAlert elevation={6} variant="filled" onClose={handleCloseSnackbar} severity={snackbar.severity}>{snackbar.message}</MuiAlert>
            </Snackbar>

            {/* Order Detail Dialog */}
            <Dialog open={orderDetailOpen} onClose={closeOrderDetail} fullWidth maxWidth="sm">
                <DialogTitle>Order Details</DialogTitle>
                <DialogContent dividers>
                    {!selectedOrder && <Typography>No order selected.</Typography>}
                    {selectedOrder && (
                        <Box>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>Customer</Typography>
                            <Typography>{selectedOrder.customer_name || selectedOrder.customer || 'N/A'}</Typography>
                            <Typography color="text.secondary" sx={{ mb: 2 }}>{selectedOrder.customer_phone || ''}</Typography>

                            <Typography variant="subtitle1" sx={{ mb: 1 }}>Items</Typography>
                            {(selectedOrder.items || []).length === 0 && <Typography color="text.secondary">No items</Typography>}
                            {(selectedOrder.items || []).map((it, idx) => (
                                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                                    <Typography>{it.name || it.itemId || 'Item'}</Typography>
                                    <Typography color="text.secondary">{(it.qty || it.quantity || it.qty === 0) ? `x${it.qty || it.quantity}` : ''} ₱{parseFloat(it.price || 0).toFixed(2)}</Typography>
                                </Box>
                            ))}

                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6">Total: ₱{parseFloat(selectedOrder.total || 0).toFixed(2)}</Typography>
                            <Typography color="text.secondary">Status: {selectedOrder.status}</Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeOrderDetail}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default OrderManager;

