// src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { databases, realtime } from '../lib/appwrite';
import { Query } from 'appwrite';

const NotificationContext = createContext();

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const ORDERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_ORDERS_COLLECTION_ID;
const RESERVATIONS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_RESERVATIONS_COLLECTION_ID;
const MESSAGES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_MESSAGES_COLLECTION_ID;

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState({
        orders: 0,
        reservations: 0,
        messages: 0,
    });
    const [notificationHistory, setNotificationHistory] = useState([]);
    const [isPolling, setIsPolling] = useState(true);

    const playNotificationSound = useCallback(() => {
        // ... (sound implementation remains the same)
    }, []);

    // Realtime subscription: prefer realtime events when available
    useEffect(() => {
        if (!realtime || !DATABASE_ID || !ORDERS_COLLECTION_ID || !RESERVATIONS_COLLECTION_ID) return;

        let sub = null;
        try {
            const topics = [
                `databases.${DATABASE_ID}.collections.${ORDERS_COLLECTION_ID}.documents`,
                `databases.${DATABASE_ID}.collections.${RESERVATIONS_COLLECTION_ID}.documents`,
            ];
            if (MESSAGES_COLLECTION_ID) topics.push(`databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`);

            sub = realtime.subscribe(topics, (response) => {
                try {
                    const events = response?.events || [];

                    // Attempt to extract collectionId from the events array first (more reliable)
                    let collectionId = null;
                    try {
                        const joined = events.join(' ');
                        const regex = new RegExp(`databases\\.${DATABASE_ID}\\.collections\\.([a-zA-Z0-9_-]+)\\.documents`);
                        const m = joined.match(regex);
                        if (m && m[1]) collectionId = m[1];
                    } catch (e) {
                        // ignore
                    }

                    // Fallback to payload document keys
                    const payload = response?.payload || response?.document || {};
                    if (!collectionId) collectionId = payload?.$collectionId || payload?.collectionId || null;

                    const isCreate = events.some(e => /\.create$/.test(e) || /documents.create/.test(e));
                    const isUpdate = events.some(e => /\.update$/.test(e) || /documents.update/.test(e));

                    // Debugging: log unexpected payloads to help diagnose realtime issues
                    if (!collectionId) {
                        console.debug('Realtime event without collectionId:', { response });
                    }

                    if (collectionId === ORDERS_COLLECTION_ID && isCreate) {
                        const notification = { type: 'order', message: `1 new order received!`, timestamp: new Date(), count: 1 };
                        setNotificationHistory((hist) => [notification, ...hist].slice(0, 50));
                        setNotifications((prev) => ({ ...prev, orders: (prev.orders || 0) + 1 }));
                        playNotificationSound();
                        try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'New order received', severity: 'info' } })); } catch(e) {}
                    }

                    if (collectionId === RESERVATIONS_COLLECTION_ID && (isCreate || isUpdate)) {
                        const notification = { type: 'reservation', message: `Reservation updated`, timestamp: new Date(), count: 1 };
                        setNotificationHistory((hist) => [notification, ...hist].slice(0, 50));
                        setNotifications((prev) => ({ ...prev, reservations: (prev.reservations || 0) + 1 }));
                        playNotificationSound();
                        try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Reservation updated', severity: 'info' } })); } catch(e) {}
                    }

                    if (MESSAGES_COLLECTION_ID && collectionId === MESSAGES_COLLECTION_ID) {
                        // Treat create as new unread message
                        if (isCreate) {
                            const notification = { type: 'message', message: `New message received`, timestamp: new Date(), count: 1 };
                            setNotificationHistory((hist) => [notification, ...hist].slice(0, 50));
                            setNotifications((prev) => ({ ...prev, messages: (prev.messages || 0) + 1 }));
                            playNotificationSound();
                            try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'New message', severity: 'info' } })); } catch(e) {}
                        }
                        // For updates (e.g., read flags), fall back to polling which will correct counts on next interval
                        if (isUpdate) {
                            console.debug('Message document updated (realtime):', payload?.$id || payload?.id || null);
                        }
                    }
                } catch (err) {
                    console.error('Realtime handler error:', err, response);
                }
            });
        } catch (err) {
            console.warn('Realtime subscribe failed, falling back to polling', err);
        }

        return () => {
            try {
                if (sub && typeof sub.unsubscribe === 'function') sub.unsubscribe();
            } catch (err) {
                // ignore
            }
        };
    }, [playNotificationSound, DATABASE_ID, ORDERS_COLLECTION_ID, RESERVATIONS_COLLECTION_ID, MESSAGES_COLLECTION_ID]);

    const checkNotifications = useCallback(async () => {
        if (!isPolling) return;

        try {
            // Check for new orders
            const ordersResponse = await databases.listDocuments(
                DATABASE_ID,
                ORDERS_COLLECTION_ID,
                [Query.equal('status', 'new')]
            );
            const ordersCount = ordersResponse.total || 0;

            // Check for new reservations
            const reservationsResponse = await databases.listDocuments(
                DATABASE_ID,
                RESERVATIONS_COLLECTION_ID,
                [Query.equal('status', 'new')]
            );
            const reservationsCount = reservationsResponse.total || 0;

            // Check for unread messages
            let messagesCount = 0;
            try {
                if (MESSAGES_COLLECTION_ID) {
                    const msgs = await databases.listDocuments(
                        DATABASE_ID,
                        MESSAGES_COLLECTION_ID,
                        [Query.equal('read', false)]
                    );
                    messagesCount = msgs.total || 0;
                }
            } catch (e) {
                console.warn('Failed to fetch unread messages count', e);
            }

            setNotifications((prev) => {
                const prevOrders = prev.orders;
                const prevReservations = prev.reservations;

                // Add to history if there are new notifications
                if (ordersCount > prevOrders) {
                    const newOrders = ordersCount - prevOrders;
                    const notification = {
                        type: 'order',
                        message: `${newOrders} new order${newOrders > 1 ? 's' : ''} received!`,
                        timestamp: new Date(),
                        count: newOrders,
                    };
                    setNotificationHistory((hist) => [notification, ...hist].slice(0, 50));
                    playNotificationSound();
                }

                if (reservationsCount > prevReservations) {
                    const newReservations = reservationsCount - prevReservations;
                    const notification = {
                        type: 'reservation',
                        message: `${newReservations} new reservation${newReservations > 1 ? 's' : ''} received!`,
                        timestamp: new Date(),
                        count: newReservations,
                    };
                    setNotificationHistory((hist) => [notification, ...hist].slice(0, 50));
                    playNotificationSound();
                }

                return {
                    orders: ordersCount,
                    reservations: reservationsCount,
                    messages: messagesCount,
                };
            });
        } catch (error) {
            console.error('Error checking notifications:', error);
        }
    }, [isPolling, playNotificationSound]);

    const clearNotifications = (type = null) => {
        // ... (implementation remains the same)
    };

    const clearHistory = () => {
        setNotificationHistory([]);
    };

    useEffect(() => {
        if (!isPolling) return;

        checkNotifications();
        const interval = setInterval(checkNotifications, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }, [checkNotifications, isPolling]);

    const totalNotifications = (notifications.orders || 0) + (notifications.reservations || 0) + (notifications.messages || 0);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                notificationHistory,
                totalNotifications,
                clearNotifications,
                clearHistory,
                setIsPolling,
                isPolling,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);

