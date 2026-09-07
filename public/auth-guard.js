// Shared Auth & Role Guard Module
import { 
  auth, 
  db, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc,
  collection,
  deleteDoc,
  onSnapshot,
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut 
} from './firebase-config.js';

// Initial Belgian client shops seed data
const DEFAULT_BELGIAN_CLIENT_SHOPS = [
  {
    id: "shop-001",
    name: "Food City Bruxelles",
    vat: "BE 0707843840",
    clientNo: "2340",
    address: "Place Saint-Pierre 12, 1040 Bruxelles"
  },
  {
    id: "shop-002",
    name: "Wine Boutique Gent",
    vat: "BE 0812345678",
    clientNo: "3120",
    address: "Veldstraat 45, 9000 Gent"
  },
  {
    id: "shop-003",
    name: "Le Caveau Liège",
    vat: "BE 0987654321",
    clientNo: "4050",
    address: "Rue Souverain-Pont 8, 4000 Liège"
  }
];

// Fetch client shops dynamically from Firestore 'shops' collection (seeds default if empty)
export async function getShops() {
  if (!auth.currentUser) {
    return [];
  }
  try {
    const shopsRef = collection(db, 'shops');
    const snap = await getDocs(shopsRef);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    
    // Seed initial client shops if collection is empty (only succeeds if authorized)
    try {
      for (const shop of DEFAULT_BELGIAN_CLIENT_SHOPS) {
        await setDoc(doc(db, 'shops', shop.id), shop);
      }
    } catch (seedErr) {
      // Ignored if current user is not admin
    }
    return DEFAULT_BELGIAN_CLIENT_SHOPS;
  } catch (err) {
    console.warn("Failed to fetch shops from Firestore, using defaults:", err);
    return DEFAULT_BELGIAN_CLIENT_SHOPS;
  }
}

// Fetch user role strictly from Firestore document /users/{uid}
export async function getUserRole(user) {
  if (!user) return null;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);
    
    if (userSnap.exists() && userSnap.data().role) {
      return userSnap.data().role;
    } else {
      // Check if this is the very first user in the system -> make admin, else evaluator
      let assignedRole = 'evaluator';
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        if (usersSnap.empty) {
          assignedRole = 'admin';
        }
      } catch (e) {
        // Fallback
      }

      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        role: assignedRole,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return assignedRole;
    }
  } catch (err) {
    console.warn("Failed to fetch user role from Firestore:", err);
    return 'evaluator';
  }
}

// Update user role in Firestore
export async function updateUserRole(targetUid, newRole) {
  const userDocRef = doc(db, 'users', targetUid);
  await updateDoc(userDocRef, {
    role: newRole,
    updatedAt: new Date().toISOString()
  });
}

// Render User Auth Bar & Role Badge across top navigation
export function setupAuthUI(user, userRole, containerId = 'auth-bar-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!user) {
    container.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-xs text-[#C8B69B] font-mono hidden sm:inline">Guest</span>
        <button onclick="window.showLoginModal()" class="btn-gold font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow">
          <span>Sign In / Register</span>
        </button>
      </div>
    `;
    return;
  }

  const roleColors = {
    admin: 'bg-[#3D0A11] text-[#F3E5AB] border border-[#D4AF37]/60',
    evaluator: 'bg-[#2A060B] text-[#F3E5AB] border border-[#D4AF37]/40',
    depot: 'bg-[#180B20] text-[#E0C3FC] border border-purple-500/40'
  };

  const roleLabels = {
    admin: '👑 Admin Manager',
    evaluator: '📋 Field Evaluator',
    depot: '📦 Depot Staff'
  };

  container.innerHTML = `
    <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
      <span class="text-xs text-[#F5EAE0] font-mono hidden md:inline truncate max-w-[180px]">${user.email}</span>
      <span class="border text-[11px] px-2.5 py-0.5 rounded-lg font-bold uppercase tracking-wider ${roleColors[userRole] || roleColors.evaluator}">
        ${roleLabels[userRole] || userRole}
      </span>
      ${userRole === 'admin' ? `
        <a href="admin.html" class="text-xs bg-[#2A060B] hover:bg-[#3D0A11] text-[#F3E5AB] border border-[#D4AF37]/40 px-2.5 py-1.5 rounded-lg font-medium transition">Admin Console</a>
      ` : ''}
      ${userRole === 'evaluator' || userRole === 'admin' ? `
        <a href="index.html" class="text-xs bg-[#2A060B] hover:bg-[#3D0A11] text-[#F3E5AB] border border-[#D4AF37]/40 px-2.5 py-1.5 rounded-lg font-medium transition">Ordering Portal</a>
      ` : ''}
      ${userRole === 'depot' || userRole === 'admin' ? `
        <a href="depot.html" class="text-xs bg-[#2A060B] hover:bg-[#3D0A11] text-[#F3E5AB] border border-[#D4AF37]/40 px-2.5 py-1.5 rounded-lg font-medium transition">Depot View</a>
      ` : ''}
      <button onclick="window.handleAuthSignOut()" class="bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs px-2.5 py-1.5 rounded-lg border border-rose-800/60 font-semibold transition">
        Sign Out
      </button>
    </div>
  `;
}

window.handleAuthSignOut = async function() {
  try {
    await signOut(auth);
    window.location.reload();
  } catch (err) {
    console.error("Sign out error:", err);
  }
};

window.showLoginModal = function(isRegister = false) {
  let modal = document.getElementById('auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'fixed inset-0 bg-[#0F0204]/90 backdrop-blur-md z-50 flex items-center justify-center p-4';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="card-theme rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
      <button onclick="document.getElementById('auth-modal').classList.add('hidden')" class="absolute top-4 right-4 text-[#F3E5AB] hover:text-white p-1">✕</button>
      <div class="text-center mb-6">
        <h3 id="modal-title" class="font-serif-title text-xl font-bold gold-gradient-text">${isRegister ? 'Create Account' : 'Sign In'}</h3>
        <p class="text-xs text-[#C8B69B] mt-1">Aurellion Wines Distribution Portal</p>
      </div>

      <form onsubmit="window.handleAuthSubmit(event, ${isRegister})" class="space-y-4">
        <div>
          <label class="block text-[11px] text-[#C8B69B] uppercase tracking-wider mb-1">Email Address</label>
          <input type="email" id="auth-email" placeholder="user@winedistribution.be" required class="w-full input-theme rounded-xl px-3 py-2.5 text-xs text-white" />
        </div>
        <div>
          <label class="block text-[11px] text-[#C8B69B] uppercase tracking-wider mb-1">Password</label>
          <input type="password" id="auth-password" placeholder="••••••••" required class="w-full input-theme rounded-xl px-3 py-2.5 text-xs text-white" />
        </div>

        <div id="auth-error" class="hidden text-xs text-rose-300 bg-rose-950/60 border border-rose-800 p-2.5 rounded-lg"></div>

        <button type="submit" id="auth-submit-btn" class="w-full btn-gold font-bold text-xs py-3 rounded-xl transition shadow">
          ${isRegister ? 'Register Account' : 'Sign In'}
        </button>
      </form>

      <div class="mt-4 text-center border-t border-[#D4AF37]/20 pt-4">
        <button onclick="window.showLoginModal(${!isRegister})" class="text-xs text-[#F3E5AB] hover:underline font-medium">
          ${isRegister ? 'Already have an account? Sign In' : 'Need an account? Register'}
        </button>
      </div>
    </div>
  `;
  modal.classList.remove('hidden');
};

window.handleAuthSubmit = async function(e, isRegister) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const errorBox = document.getElementById('auth-error');
  const submitBtn = document.getElementById('auth-submit-btn');

  if (errorBox) errorBox.classList.add('hidden');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';

  try {
    if (isRegister) {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      // First registered user becomes admin if users collection is empty
      let role = 'evaluator';
      try {
        const snap = await getDocs(collection(db, 'users'));
        if (snap.size <= 1) role = 'admin';
      } catch (e) {}

      await setDoc(doc(db, 'users', userCred.user.uid), {
        uid: userCred.user.uid,
        email: email,
        role: role,
        createdAt: new Date().toISOString()
      });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
    window.location.reload();
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = isRegister ? 'Register Account' : 'Sign In';
    if (errorBox) {
      errorBox.textContent = `Authentication error: ${err.message}`;
      errorBox.classList.remove('hidden');
    }
  }
};
