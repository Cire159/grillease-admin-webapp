import React, { useEffect, useState, useRef } from 'react';
import { databases, realtime } from '../lib/appwrite';
import { Box, Button, TextField, List, ListItem, ListItemText, Typography, IconButton, Chip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const MESSAGES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_MESSAGES_COLLECTION_ID;

const MessageManager = ({ filterReservationId = null }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const boxRef = useRef();

  useEffect(() => {
    fetchMessages();

    let unsubscribe;
    try {
      unsubscribe = realtime.subscribe(`databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`, res => {
        // on any change refresh
        fetchMessages();
      });
    } catch (e) {
      console.warn('Realtime subscribe messages failed', e);
    }

    return () => { try { if (typeof unsubscribe === 'function') unsubscribe(); } catch(_){} };
  }, [filterOrderId]);

  const fetchMessages = async () => {
    if (!MESSAGES_COLLECTION_ID) return setLoading(false);
    setLoading(true);
    try {
      const res = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION_ID);
      let docs = res.documents || [];
      if (filterReservationId) docs = docs.filter(d => d.reservationId === filterReservationId || d.reservationId === (filterReservationId?.toString()));
      docs.sort((a,b)=> new Date(a.createdAt || a.timestamp || 0) - new Date(b.createdAt || b.timestamp || 0));
      setMessages(docs);
    } catch (e) {
      console.error('fetchMessages', e);
    } finally { setLoading(false); scrollBottom(); }
  };

  const sendMessage = async () => {
    if (!text.trim() || !MESSAGES_COLLECTION_ID) return;
    try {
      const payload = {
        reservationId: filterReservationId || null,
        from: 'staff',
        to: 'customer',
        message: text.trim(),
        read: false,
        createdAt: new Date().toISOString()
      };
      await databases.createDocument(DATABASE_ID, MESSAGES_COLLECTION_ID, undefined, payload);
      setText('');
      fetchMessages();
    } catch (e) { console.error('sendMessage', e); }
  };

  const markRead = async (id) => {
    try {
      await databases.updateDocument(DATABASE_ID, MESSAGES_COLLECTION_ID, id, { read: true });
      fetchMessages();
    } catch (e) { console.error('markRead', e); }
  };

  const scrollBottom = () => {
    setTimeout(()=>{ try{ boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' }); }catch(_){} }, 150);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Messages</Typography>
        <IconButton onClick={fetchMessages}><RefreshIcon/></IconButton>
      </Box>

      <Box ref={boxRef} sx={{ maxHeight: 360, overflow: 'auto', mb: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        {loading && <Typography color="text.secondary">Loading...</Typography>}
        {!loading && messages.length === 0 && <Typography color="text.secondary">No messages yet.</Typography>}
        <List>
          {messages.map(m => (
            <ListItem key={m.$id} secondaryAction={(
              <Button size="small" onClick={() => markRead(m.$id)}>{m.read ? 'Read' : 'Mark read'}</Button>
            )}>
              <ListItemText primary={m.message} secondary={m.from + (m.reservationId ? ` — reservation ${m.reservationId}` : '')} />
              <Chip label={m.read ? 'Read' : 'Unread'} color={m.read ? 'success' : 'warning'} size="small" sx={{ ml: 1 }}/>
            </ListItem>
          ))}
        </List>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField value={text} onChange={(e)=>setText(e.target.value)} placeholder="Type a message..." fullWidth size="small" />
        <Button variant="contained" onClick={sendMessage}>Send</Button>
      </Box>
    </Box>
  );
};

export default MessageManager;
