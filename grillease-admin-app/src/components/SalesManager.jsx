import React, { useState, useEffect } from 'react';
import { databases } from '../lib/appwrite';
import { 
    Box, Typography, CircularProgress, Alert, Card, CardContent, Grid, Chip, 
    Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, Select, FormControl, InputLabel, Table, TableBody, 
    TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip
} from '@mui/material';
import { 
    TrendingUp as TrendingUpIcon, 
    Receipt as ReceiptIcon, 
    Refresh as RefreshIcon,
    Delete as DeleteIcon,
    Cancel as CancelIcon,
    History as HistoryIcon
} from '@mui/icons-material';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const SALES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_SALES_COLLECTION_ID;
const ORDERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID;

const SalesManager = () => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [revenue, setRevenue] = useState(0);
    const [voidDialogOpen, setVoidDialogOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    const [voidReason, setVoidReason] = useState('');
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            setLoading(true);
            const response = await databases.listDocuments(DATABASE_ID, SALES_COLLECTION_ID);
            const salesData = response.documents || [];
            setSales(salesData);
            
            // Calculate total revenue from completed sales
            const totalRevenue = salesData
                .filter(sale => sale.status === 'completed' && !sale.voided)
                .reduce((sum, sale) => sum + parseFloat(sale.amount || 0), 0);
            setRevenue(totalRevenue);
            setError(null);
        } catch (err) {
            console.error('Error fetching sales:', err);
            setError('Failed to load sales data');
        } finally {
            setLoading(false);
        }
    };

    const handleVoidSale = async () => {
        if (!selectedSale || !voidReason.trim()) return;

        try {
            await databases.updateDocument(DATABASE_ID, SALES_COLLECTION_ID, selectedSale.$id, {
                voided: true,
                voidReason: voidReason.trim(),
                voidedAt: new Date().toISOString()
            });
            
            setVoidDialogOpen(false);
            setVoidReason('');
            fetchSales();
            setError('Sale voided successfully');
        } catch (err) {
            console.error('Error voiding sale:', err);
            setError('Failed to void sale');
        }
    };

    const handleResetRevenue = async () => {
        try {
            // Create a revenue reset record
            await databases.createDocument(DATABASE_ID, SALES_COLLECTION_ID, 'revenue_reset', {
                type: 'revenue_reset',
                amount: revenue,
                resetAt: new Date().toISOString(),
                reason: 'Manual reset by admin'
            });
            
            setResetDialogOpen(false);
            fetchSales();
            setError('Revenue reset successfully');
        } catch (err) {
            console.error('Error resetting revenue:', err);
            setError('Failed to reset revenue');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                <CircularProgress size={60} />
                <Typography sx={{ ml: 2 }}>Loading sales data...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Alert 
                severity={error.includes('successfully') ? 'success' : 'error'}
                onClose={() => setError(null)}
                sx={{ mb: 3 }}
            >
                {error}
            </Alert>
        );
    }

    const stats = {
        totalSales: sales.filter(s => s.type !== 'revenue_reset').length,
        completedSales: sales.filter(s => s.status === 'completed' && !s.voided).length,
        voidedSales: sales.filter(s => s.voided).length,
        pendingSales: sales.filter(s => s.status === 'pending').length,
    };

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
                    📊 Sales Management
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchSales}
                        sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => setResetDialogOpen(true)}
                        sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                    >
                        Reset Revenue
                    </Button>
                </Box>
            </Box>

            {/* Statistics Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
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
                        <TrendingUpIcon sx={{ fontSize: 24, mb: 1, color: 'primary.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {formatCurrency(revenue)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            Total Revenue
                        </Typography>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
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
                        <ReceiptIcon sx={{ fontSize: 24, mb: 1, color: 'success.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {stats.completedSales}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            Completed Sales
                        </Typography>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
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
                        <CancelIcon sx={{ fontSize: 24, mb: 1, color: 'error.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {stats.voidedSales}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            Voided Sales
                        </Typography>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
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
                        <HistoryIcon sx={{ fontSize: 24, mb: 1, color: 'warning.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {stats.totalSales}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            Total Transactions
                        </Typography>
                    </Card>
                </Grid>
            </Grid>

            {/* Sales History Table */}
            <Card
                sx={{
                    borderRadius: 2,
                    boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        📋 Sales History
                    </Typography>
                    
                    {sales.length === 0 ? (
                        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                            No sales transactions recorded yet.
                        </Typography>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date & Time</TableCell>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sales
                                        .filter(sale => sale.type !== 'revenue_reset')
                                        .sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0))
                                        .map((sale) => (
                                            <TableRow key={sale.$id} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                                                <TableCell>
                                                    {formatDate(sale.createdAt || sale.timestamp || sale.date || new Date().toISOString())}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontWeight: 'bold', color: sale.voided ? 'error.main' : 'text.primary' }}>
                                                        {sale.voided ? 'VOIDED' : formatCurrency(parseFloat(sale.amount || 0))}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={sale.type || 'Sale'} 
                                                        color={sale.type === 'revenue_reset' ? 'warning' : 'primary'}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {sale.voided ? (
                                                        <Chip label="Voided" color="error" size="small" />
                                                    ) : (
                                                        <Chip label={sale.status || 'Completed'} color="success" size="small" />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {!sale.voided && (
                                                        <Tooltip title="Void Sale">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => {
                                                                    setSelectedSale(sale);
                                                                    setVoidDialogOpen(true);
                                                                }}
                                                            >
                                                                <CancelIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            {/* Void Sale Dialog */}
            <Dialog open={voidDialogOpen} onClose={() => setVoidDialogOpen(false)}>
                <DialogTitle>Void Sale</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        Are you sure you want to void this sale for {selectedSale ? formatCurrency(parseFloat(selectedSale.amount || 0)) : '0.00'}?
                    </Typography>
                    <TextField
                        fullWidth
                        label="Void Reason"
                        multiline
                        rows={3}
                        value={voidReason}
                        onChange={(e) => setVoidReason(e.target.value)}
                        placeholder="Enter reason for voiding this sale..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setVoidDialogOpen(false)}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        color="error"
                        onClick={handleVoidSale}
                        disabled={!voidReason.trim()}
                    >
                        Void Sale
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reset Revenue Dialog */}
            <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
                <DialogTitle>Reset Revenue</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        This will reset the total revenue to ₱0.00 and create a reset record in the sales history.
                    </Typography>
                    <Typography sx={{ fontWeight: 'bold', color: 'error.main' }}>
                        Current Revenue: {formatCurrency(revenue)}
                    </Typography>
                    <Typography sx={{ mt: 2, color: 'text.secondary', fontSize: '0.875rem' }}>
                        This action cannot be undone. Are you sure you want to proceed?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        color="error"
                        onClick={handleResetRevenue}
                    >
                        Reset Revenue
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SalesManager;
