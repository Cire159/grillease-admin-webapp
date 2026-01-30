import React, { useState, useEffect } from 'react';
import { databases } from '../lib/appwrite';
import { ID } from 'appwrite';
import { TextField, Button, Typography, Container, Box, Alert, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, ListItemSecondaryAction, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const CATEGORIES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_CATEGORIES_COLLECTION_ID;

const CategoriesManager = ({ onCategoryUpdate }) => {
    const [categories, setCategories] = useState([]);
    const [categoryName, setCategoryName] = useState('');
    const [categoryColor, setCategoryColor] = useState('#2196F3');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('#2196F3');

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await databases.listDocuments(DATABASE_ID, CATEGORIES_COLLECTION_ID);
            const docs = (response.documents || []).map(d => ({
                $id: d.$id,
                name: d.name || '',
                color: d.color || '#2196F3',
            }));
            setCategories(docs);
            if (onCategoryUpdate) onCategoryUpdate(docs);
        } catch (error) {
            console.error("Error fetching categories:", error);
            setMessage('Error loading categories.');
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!categoryName.trim()) {
            setMessage('Please enter a category name.');
            return;
        }

        setLoading(true);
        setMessage('Adding category...');

        try {
            const categoryData = {
                name: categoryName.trim(),
                color: categoryColor,
            };

            await databases.createDocument(DATABASE_ID, CATEGORIES_COLLECTION_ID, ID.unique(), categoryData);
            setMessage('Category added successfully!');
            setCategoryName('');
            setCategoryColor('#2196F3');
            fetchCategories();
        } catch (error) {
            console.error("Error adding category:", error);
            setMessage(`Error: ${error.message || 'Failed to add category.'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        try {
            setLoading(true);
            await databases.deleteDocument(DATABASE_ID, CATEGORIES_COLLECTION_ID, categoryId);
            setMessage('Category deleted successfully!');
            fetchCategories();
        } catch (error) {
            console.error("Error deleting category:", error);
            setMessage('Error deleting category.');
        } finally {
            setLoading(false);
        }
    };

    const openEditDialog = (category) => {
        setCategoryToEdit(category);
        setEditName(category.name);
        setEditColor(category.color);
        setShowEditDialog(true);
    };

    const closeEditDialog = () => {
        setShowEditDialog(false);
        setCategoryToEdit(null);
    };

    const handleEditSubmit = async () => {
        if (!categoryToEdit) return;
        
        try {
            setLoading(true);
            const categoryData = {
                name: editName.trim(),
                color: editColor,
            };

            await databases.updateDocument(DATABASE_ID, CATEGORIES_COLLECTION_ID, categoryToEdit.$id, categoryData);
            setMessage('Category updated successfully!');
            setShowEditDialog(false);
            setCategoryToEdit(null);
            fetchCategories();
        } catch (error) {
            console.error("Error updating category:", error);
            setMessage('Error updating category.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', px: { xs: 1, sm: 0 } }}>
                <Box
                    sx={{
                        backgroundColor: 'background.paper',
                        borderRadius: 2,
                        p: 2.5,
                        mb: 3,
                        width: '100%',
                        maxWidth: { xs: '100%', sm: '600px' },
                        boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Typography
                        variant="h5"
                        component="h2"
                        sx={{
                            fontSize: { xs: '1.25rem', sm: '1.5rem' },
                            textAlign: 'center',
                            color: 'text.primary',
                            fontWeight: 600,
                        }}
                    >
                        Categories Management
                    </Typography>
                </Box>

                {message && (
                    <Alert severity={message.includes('Error') ? 'error' : 'success'} sx={{ width: '100%', mb: 2 }}>
                        {message}
                    </Alert>
                )}

                <Box
                    component="form"
                    onSubmit={handleAddCategory}
                    sx={{
                        mt: 1,
                        width: '100%',
                        maxWidth: { xs: '100%', sm: '600px' },
                        backgroundColor: 'background.paper',
                        borderRadius: 2,
                        p: 3,
                        boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Typography
                        variant="h6"
                        component="h3"
                        gutterBottom
                        sx={{
                            fontSize: { xs: '1.125rem', sm: '1.25rem' },
                            color: 'text.primary',
                            fontWeight: 600,
                            mb: 2,
                        }}
                    >
                        Add New Category
                    </Typography>
                    <TextField
                        label="Category Name"
                        fullWidth
                        margin="normal"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        required
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: { xs: '1rem', sm: '1rem' },
                            },
                        }}
                    />
                    <TextField
                        label="Category Color"
                        type="color"
                        fullWidth
                        margin="normal"
                        value={categoryColor}
                        onChange={(e) => setCategoryColor(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: { xs: '1rem', sm: '1rem' },
                                height: '56px',
                            },
                        }}
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={loading}
                        startIcon={<AddIcon />}
                        sx={{
                            mt: 2,
                            mb: 2,
                            minHeight: { xs: 48, sm: 40 },
                            fontSize: { xs: '1rem', sm: '1rem' },
                        }}
                        fullWidth
                    >
                        {loading ? 'Processing...' : 'Add Category'}
                    </Button>
                </Box>

                <hr style={{ width: '100%', margin: '24px 0' }}/>

                <Box
                    sx={{
                        backgroundColor: 'background.paper',
                        borderRadius: 2,
                        p: 2.5,
                        mt: 4,
                        mb: 3,
                        width: '100%',
                        boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                        border: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Typography
                        variant="h6"
                        component="h3"
                        sx={{
                            fontSize: { xs: '1.125rem', sm: '1.25rem' },
                            color: 'text.primary',
                            fontWeight: 600,
                        }}
                    >
                        Categories ({categories.length})
                    </Typography>
                </Box>

                <Box sx={{
                    width: '100%',
                    maxWidth: { xs: '100%', sm: '600px' },
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    p: 2,
                    boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
                    border: '1px solid',
                    borderColor: 'divider',
                }}>
                    {categories.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                            No categories found. Add your first category above.
                        </Typography>
                    ) : (
                        <List>
                            {categories.map((category) => (
                                <ListItem
                                    key={category.$id}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        mb: 1,
                                        '&:last-child': {
                                            mb: 0,
                                        },
                                    }}
                                >
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Chip
                                                    label={category.name}
                                                    sx={{
                                                        backgroundColor: category.color,
                                                        color: 'white',
                                                        fontWeight: 'bold',
                                                    }}
                                                />
                                            </Box>
                                        }
                                        secondary={`Color: ${category.color}`}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            aria-label="edit"
                                            onClick={() => openEditDialog(category)}
                                            sx={{ mr: 1 }}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            edge="end"
                                            aria-label="delete"
                                            onClick={() => handleDeleteCategory(category.$id)}
                                            color="error"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>
            </Box>

            {/* Edit Category Dialog */}
            <Dialog open={showEditDialog} onClose={closeEditDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Category</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Category Name"
                        fullWidth
                        margin="normal"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: '1rem',
                            },
                        }}
                    />
                    <TextField
                        label="Category Color"
                        type="color"
                        fullWidth
                        margin="normal"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: '1rem',
                                height: '56px',
                            },
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeEditDialog} disabled={loading}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleEditSubmit} 
                        color="primary" 
                        variant="contained"
                        disabled={loading}
                        startIcon={<SaveIcon />}
                    >
                        {loading ? 'Updating...' : 'Update Category'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CategoriesManager;