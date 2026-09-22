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
  signOut 
} from './firebase-config.js';

// Fetch client shops dynamically from Firestore 'shops' collection
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
    return [];
  } catch (err) {
    console.warn("Failed to fetch shops from Firestore:", err);
    return [];
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
      const assignedRole = 'evaluator';

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
        <a href="index.html" class="text-xs bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-[#BA1628] border border-slate-200 px-3 py-1.5 rounded-xl font-medium transition">Orders</a>
        <a href="contact.html" class="text-xs bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-[#BA1628] border border-slate-200 px-3 py-1.5 rounded-xl font-medium transition">Contact</a>
        <button onclick="window.showLoginModal()" class="btn-gold font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow">
          <span>Sign In</span>
        </button>
      </div>
    `;
    return;
  }

  const roleColors = {
    admin: 'bg-rose-100 text-[#BA1628] border border-rose-300',
    evaluator: 'bg-slate-100 text-slate-700 border border-slate-300',
    depot: 'bg-purple-100 text-purple-800 border border-purple-300'
  };

  const roleLabels = {
    admin: '👑 Admin',
    evaluator: '📋 Evaluator',
    depot: '📦 Depot'
  };

  container.innerHTML = `
    <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
      <span class="border text-[11px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider ${roleColors[userRole] || roleColors.evaluator}">
        ${roleLabels[userRole] || userRole}
      </span>
      <a href="index.html" class="text-xs bg-slate-100 hover:bg-rose-50 text-slate-800 hover:text-[#BA1628] border border-slate-200 px-2.5 py-1 rounded-lg font-medium transition">Orders</a>
      <a href="contact.html" class="text-xs bg-slate-100 hover:bg-rose-50 text-slate-800 hover:text-[#BA1628] border border-slate-200 px-2.5 py-1 rounded-lg font-medium transition">Contact</a>
      ${userRole === 'admin' ? `
        <a href="admin.html" class="text-xs bg-slate-100 hover:bg-rose-50 text-slate-800 hover:text-[#BA1628] border border-slate-200 px-2.5 py-1 rounded-lg font-medium transition">Admin</a>
      ` : ''}
      ${userRole === 'depot' || userRole === 'admin' ? `
        <a href="depot.html" class="text-xs bg-slate-100 hover:bg-rose-50 text-slate-800 hover:text-[#BA1628] border border-slate-200 px-2.5 py-1 rounded-lg font-medium transition">Depot</a>
      ` : ''}
      <button onclick="window.handleAuthSignOut()" class="bg-rose-50 hover:bg-rose-100 text-[#BA1628] text-xs px-2.5 py-1 rounded-lg border border-rose-200 font-semibold transition">
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

window.showLoginModal = function() {
  let modal = document.getElementById('auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="card-theme rounded-2xl max-w-md w-full p-6 shadow-2xl relative bg-white border border-slate-200 text-slate-900">
      <button onclick="document.getElementById('auth-modal').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 font-bold">✕</button>
      <div class="text-center mb-6">
        <h3 id="modal-title" class="font-serif-title text-xl font-bold text-[#BA1628]">Sign In</h3>
        <p class="text-xs text-slate-600 mt-1">Aurellion Wines Distribution Portal</p>
      </div>

      <form onsubmit="window.handleAuthSubmit(event)" class="space-y-4">
        <div>
          <label class="block text-[11px] text-slate-700 font-semibold uppercase tracking-wider mb-1">Email Address</label>
          <input type="email" id="auth-email" placeholder="user@winedistribution.be" required class="w-full input-theme rounded-xl px-3 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-300" />
        </div>
        <div>
          <label class="block text-[11px] text-slate-700 font-semibold uppercase tracking-wider mb-1">Password</label>
          <input type="password" id="auth-password" placeholder="••••••••" required class="w-full input-theme rounded-xl px-3 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-300" />
        </div>

        <div id="auth-error" class="hidden text-xs text-rose-800 bg-rose-50 border border-rose-200 p-2.5 rounded-lg"></div>

        <button type="submit" id="auth-submit-btn" class="w-full btn-gold font-bold text-xs py-3 rounded-xl transition shadow">
          Sign In
        </button>
      </form>
    </div>
  `;
  modal.classList.remove('hidden');
};

window.handleAuthSubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const errorBox = document.getElementById('auth-error');
  const submitBtn = document.getElementById('auth-submit-btn');

  if (errorBox) errorBox.classList.add('hidden');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in...';

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const role = await getUserRole(userCred.user);
    
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');

    // Land on evaluator page (index.html) by default for new/evaluator users
    const currentPath = window.location.pathname;
    if (role === 'admin' && currentPath.includes('admin')) {
      window.location.reload();
    } else if (role === 'depot' && currentPath.includes('depot')) {
      window.location.reload();
    } else {
      // Default: Always land on Evaluator ordering page
      window.location.href = 'index.html';
    }
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
    if (errorBox) {
      errorBox.textContent = `Authentication error: ${err.message}`;
      errorBox.classList.remove('hidden');
    }
  }
};
