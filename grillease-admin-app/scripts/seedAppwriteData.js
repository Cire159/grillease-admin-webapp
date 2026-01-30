/*
  scripts/seedAppwriteData.js
  Simple Appwrite seeder using the HTTP API (axios).

  Usage:
    1. Install dependencies (if not already): `npm install axios`
    2. Set environment variables or replace the placeholders below.
       - APPWRITE_ENDPOINT (e.g. https://[HOST]/v1)
       - APPWRITE_PROJECT (project ID)
       - APPWRITE_API_KEY (admin API key)
       - DATABASE_ID
       - USERS_COLLECTION_ID
       - RESERVATIONS_COLLECTION_ID
       - ORDERS_COLLECTION_ID
       - MENU_COLLECTION_ID
    3. Run: `node scripts/seedAppwriteData.js`

  The script will attempt to create a few sample documents in each collection.
  It expects the collections already exist in the provided database. If you want
  the script to create collections as well, I can extend it — tell me and I will.
*/

import 'dotenv/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Defaults (will be overridden by environment variables or .env)
const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
const PROJECT = process.env.APPWRITE_PROJECT || process.env.VITE_APPWRITE_PROJECT || 'grillease';
const KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_KEY || 'standard_d31607a7bd78988119600429654f007cae41d146cb69162d96caae85d295da16337c96a4f7b32f7fd5d8ff52127bb639e1ffa7643c3b3dbd76106c0ae9eeb1911f6c7c90bbd7b4956b94d53d5570a21f61311d69c4a4f9bca830f5039a1bd3e85e16b9da520ce0eedcbb5318e1f14660035cb04f3063c76871ee072b8ea0c2b3';
const DATABASE_ID = process.env.DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID || 'grillease-db';

const USERS_COLLECTION_ID = process.env.USERS_COLLECTION_ID || process.env.VITE_APPWRITE_USERS_COLLECTION_ID || 'users';
const RESERVATIONS_COLLECTION_ID = process.env.RESERVATIONS_COLLECTION_ID || process.env.VITE_APPWRITE_RESERVATIONS_COLLECTION_ID || 'reservation';
const ORDERS_COLLECTION_ID = process.env.ORDERS_COLLECTION_ID || process.env.VITE_APPWRITE_ORDERS_COLLECTION_ID || 'order';
const MENU_COLLECTION_ID = process.env.MENU_COLLECTION_ID || process.env.VITE_APPWRITE_MENU_COLLECTION_ID || 'menu';
const MESSAGES_COLLECTION_ID = process.env.MESSAGES_COLLECTION_ID || process.env.VITE_APPWRITE_MESSAGES_COLLECTION_ID || 'messages';

const client = axios.create({
  baseURL: ENDPOINT,
  headers: {
    'X-Appwrite-Project': PROJECT,
    'X-Appwrite-Key': KEY,
    'Content-Type': 'application/json',
  },
});

async function createUser(email, password, name) {
  try {
    const res = await client.post('/users', {
      userId: 'unique()',
      email: email,
      password: password,
      name: name,
    });
    console.log(`Created user:`, res.data.$id, email);
    return res.data;
  } catch (err) {
    console.error(`Failed to create user ${email}:`, err?.response?.data || err.message);
    return null;
  }
}

async function createDocument(collectionId, payload) {
  try {
    const id = uuidv4();
    const res = await client.post(`/databases/${DATABASE_ID}/collections/${collectionId}/documents`, {
      documentId: id,
      data: payload,
    });
    console.log(`Created document in ${collectionId}:`, res.data.$id || id);
    return res.data;
  } catch (err) {
    console.error(`Failed to create document in ${collectionId}:`, err?.response?.data || err.message);
    return null;
  }
}

async function run() {
  console.log('Seeding Appwrite database:', DATABASE_ID);

  // Create staff user for login
  const staffUser = await createUser('cirelibre@gmail.com', 'libre123', 'Staff Admin');

  // Sample users
  const user1 = await createDocument(USERS_COLLECTION_ID, {
    email: 'alice@example.com',
    name: 'Alice Rivera',
    phone: '+15551234567',
    address: '12 Sea Breeze Ave',
  });

  const user2 = await createDocument(USERS_COLLECTION_ID, {
    email: 'bob@example.com',
    name: 'Bob Castillo',
    phone: '+15557654321',
    address: '88 Market St',
  });

  // Sample menu items
  const burger = await createDocument(MENU_COLLECTION_ID, {
    name: 'Classic Burger',
    price: 8.99,
    category: 'Burgers',
    image: 'https://via.placeholder.com/400x300.png?text=Classic+Burger',
    description: 'Juicy beef patty with lettuce, tomato, and our secret sauce.'
  });

  const fries = await createDocument(MENU_COLLECTION_ID, {
    name: 'Crispy Fries',
    price: 3.5,
    category: 'Sides',
    image: 'https://via.placeholder.com/400x300.png?text=Fries',
    description: 'Golden hand-cut fries with sea salt.'
  });

  // Sample reservations
  reservation = await createDocument(RESERVATIONS_COLLECTION_ID, {
    id: uuidv4(),
    userId: 'staff',
    customer_name: 'John Doe',
    phone_number: '+1234567890',
    date: new Date().toISOString(),
    time: '19:00',
    party_size: 4,
    guests: 4,
    status: 'Pending',
    createdAt: new Date().toISOString()
  });

  let reservation2 = await createDocument(RESERVATIONS_COLLECTION_ID, {
    id: uuidv4(),
    userId: 'staff',
    customer_name: 'Jane Smith',
    phone_number: '+0987654321',
    date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    time: '20:00',
    party_size: 2,
    guests: 2,
    status: 'Confirmed',
    createdAt: new Date().toISOString()
  });

  // Sample orders (include customer fields and qty to match admin/mobile schemas)
  if (user2 && burger && fries) {
    await createDocument(ORDERS_COLLECTION_ID, {
      userId: user2.$id || null,
      customer_name: user2.name || 'Bob Castillo',
      customer_phone: user2.phone || '+15557654321',
      items: [
        { itemId: burger.$id || null, name: burger.name || 'Classic Burger', price: 8.99, qty: 1 },
        { itemId: fries.$id || null, name: fries.name || 'Crispy Fries', price: 3.5, qty: 1 }
      ],
      total: 12.49,
      status: 'pending',
      serviceType: 'dine-in',
      createdAt: new Date().toISOString()
    });
  }

  // Sample messages attached to reservation (reservation-only messaging)
  if (user2) {
    await createDocument(MESSAGES_COLLECTION_ID, {
      reservationId: reservation ? reservation.$id : null,
      from: user2.$id || null,
      to: 'staff',
      message: 'Hi, I have a question about my reservation.',
      read: false,
      createdAt: new Date().toISOString()
    });

    await createDocument(MESSAGES_COLLECTION_ID, {
      reservationId: reservation ? reservation.$id : null,
      from: 'staff',
      to: user2.$id || null,
      message: 'Sure — what can we help with regarding your reservation?',
      read: false,
      createdAt: new Date().toISOString()
    });
  }

  console.log('Seeding complete.');
}

run().catch(err => {
  console.error('Seeder error:', err);
  process.exit(1);
});
