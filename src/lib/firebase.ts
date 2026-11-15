import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyB5NQII0d_GqimWR08RkfjoEB6tFcXSkeQ',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'chefcita.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'chefcita',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'chefcita.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '965925513976',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:965925513976:web:b35b897ddf2d696344290d',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-QTPFMYFBJZ',
};

// Inicializar Firebase de forma segura para SSR y Cliente en Next.js
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Instancia de Cloud Firestore para persistir insumos, recetas y pedidos en la nube
export const firestoreDb = getFirestore(firebaseApp);

// Inicializar Firebase Analytics únicamente en el navegador
let analyticsInstance: Analytics | null = null;

export async function initFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;
  if (analyticsInstance) return analyticsInstance;
  try {
    const supported = await isSupported();
    if (supported) {
      analyticsInstance = getAnalytics(firebaseApp);
      return analyticsInstance;
    }
  } catch {
    // Ignorar en entornos donde analytics esté bloqueado por el navegador
  }
  return null;
}
