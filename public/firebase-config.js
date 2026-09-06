// Firebase SDK Configuration & Initialization (v10 modular CDN)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc,
  doc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// Fetch hosting config if available, or use project config
let firebaseConfig = {
  projectId: "wine-catalog-belgium",
  authDomain: "wine-catalog-belgium.firebaseapp.com",
  storageBucket: "wine-catalog-belgium.appspot.com"
};

try {
  const initRes = await fetch('/__/firebase/init.json');
  if (initRes.ok) {
    const hostedConfig = await initRes.json();
    firebaseConfig = { ...firebaseConfig, ...hostedConfig };
  }
} catch (e) {
  console.log("Not running on Firebase Hosting init endpoint, using default config");
}

// Force the CORS-configured Google Cloud Storage bucket domain
firebaseConfig.storageBucket = "wine-catalog-belgium.appspot.com";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { 
  app,
  db, 
  storage, 
  auth,
  collection, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc,
  doc, 
  deleteDoc, 
  onSnapshot, 
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  ref, 
  uploadBytes, 
  getDownloadURL,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};

