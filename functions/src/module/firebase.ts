import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

initializeApp();
export const db = getFirestore();
export const storage = getStorage();
export const auth = getAuth();
