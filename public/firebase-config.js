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

const firebaseConfig = {
  projectId: "wine-catalog-belgium",
  authDomain: "wine-catalog-belgium.firebaseapp.com",
  storageBucket: "wine-catalog-belgium.appspot.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { 
  db, 
  storage, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  onSnapshot, 
  ref, 
  uploadBytes, 
  getDownloadURL 
};
