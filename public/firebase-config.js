// Firebase SDK Configuration & Initialization (v10 modular CDN)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  onSnapshot 
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
  setDoc, 
  doc, 
  deleteDoc, 
  onSnapshot, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
