import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { Card, Deck, ReviewLog, UserSettings } from '../models/types';

// Initialize Firebase only if config is provided
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isFirebaseConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

const app = isFirebaseConfigured ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()) : null;
export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  if (!auth) throw new Error('Firebase is not configured.');
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logOut = async () => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

export const syncDataToCloud = async (userId: string, data: { cards: Card[], decks: Deck[], logs: ReviewLog[], settings: UserSettings }) => {
  if (!db) throw new Error('Firebase is not configured.');
  
  try {
    let batch = writeBatch(db);
    let opCount = 0;

    const commitBatch = async () => {
      if (opCount > 0) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    };

    const addOp = async (ref: any, docData: any) => {
      batch.set(ref, docData);
      opCount++;
      if (opCount === 500) {
        await commitBatch();
      }
    };

    // Save settings
    const settingsRef = doc(db, `users/${userId}/data/settings`);
    await addOp(settingsRef, data.settings);

    // Save cards
    for (const card of data.cards) {
      const cardRef = doc(db, `users/${userId}/cards/${card.id}`);
      await addOp(cardRef, card);
    }

    // Save decks
    for (const deck of data.decks) {
      const deckRef = doc(db, `users/${userId}/decks/${deck.id}`);
      await addOp(deckRef, deck);
    }

    // Save logs
    for (const log of data.logs) {
      const logRef = doc(db, `users/${userId}/logs/${log.id}`);
      await addOp(logRef, log);
    }

    await commitBatch();
    return true;
  } catch (error) {
    console.error("Error syncing to cloud", error);
    throw error;
  }
};

export const fetchCloudData = async (userId: string) => {
  if (!db) throw new Error('Firebase is not configured.');
  
  try {
    const settingsDoc = await getDoc(doc(db, `users/${userId}/data/settings`));
    const settings = settingsDoc.exists() ? settingsDoc.data() as UserSettings : null;

    const cardsSnapshot = await getDocs(collection(db, `users/${userId}/cards`));
    const cards = cardsSnapshot.docs.map(doc => doc.data() as Card);

    const decksSnapshot = await getDocs(collection(db, `users/${userId}/decks`));
    const decks = decksSnapshot.docs.map(doc => doc.data() as Deck);

    const logsSnapshot = await getDocs(collection(db, `users/${userId}/logs`));
    const logs = logsSnapshot.docs.map(doc => doc.data() as ReviewLog);

    return { settings, cards, decks, logs };
  } catch (error) {
    console.error("Error fetching from cloud", error);
    throw error;
  }
};

export { isFirebaseConfigured };
