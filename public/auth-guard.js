// Shared Auth & Role Guard Module
import { 
  auth, 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut 
} from './firebase-config.js';

export const BELGIAN_CLIENT_SHOPS = [
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

export async function getUserRole(user) {
  if (!user) return null;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      return userSnap.data().role || 'evaluator';
    } else {
      // Infer role from email or default to evaluator
      let role = 'evaluator';
      if (user.email.includes('admin')) role = 'admin';
      else if (user.email.includes('depot')) role = 'depot';
      
      // Auto-initialize user doc in Firestore
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        role: role,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return role;
    }
  } catch (err) {
    console.warn("Failed to fetch user role from Firestore:", err);
    if (user.email && user.email.includes('admin')) return 'admin';
    if (user.email && user.email.includes('depot')) return 'depot';
    return 'evaluator';
  }
}

export function setupAuthUI(user, userRole, containerId = 'auth-bar-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!user) {
    container.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-400 font-mono hidden sm:inline">Guest</span>
        <button onclick="window.showDemoLoginModal()" class="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow">
          <span>Sign In / Demo Accounts</span>
        </button>
      </div>
    `;
    return;
  }

  const roleColors = {
    admin: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    evaluator: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    depot: 'bg-sky-500/20 text-sky-400 border-sky-500/40'
  };

  const roleLabels = {
    admin: '👑 Admin Manager',
    evaluator: '📋 Field Evaluator',
    depot: '📦 Depot Staff'
  };

  container.innerHTML = `
    <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
      <span class="text-xs text-slate-300 font-mono hidden md:inline truncate max-w-[180px]">${user.email}</span>
      <span class="border text-[11px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${roleColors[userRole] || roleColors.evaluator}">
        ${roleLabels[userRole] || userRole}
      </span>
      ${userRole === 'admin' ? `
        <a href="admin.html" class="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-2.5 py-1.5 rounded-lg font-medium transition">Admin Portal</a>
      ` : ''}
      ${userRole === 'evaluator' || userRole === 'admin' ? `
        <a href="index.html" class="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 px-2.5 py-1.5 rounded-lg font-medium transition">Ordering Flow</a>
      ` : ''}
      ${userRole === 'depot' || userRole === 'admin' ? `
        <a href="depot.html" class="text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 px-2.5 py-1.5 rounded-lg font-medium transition">Depot View</a>
      ` : ''}
      <button onclick="window.handleAuthSignOut()" class="bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs px-2.5 py-1.5 rounded-lg border border-rose-800/50 font-semibold transition">
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

window.showDemoLoginModal = function() {
  let modal = document.getElementById('demo-login-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'demo-login-modal';
    modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button onclick="document.getElementById('demo-login-modal').classList.add('hidden')" class="absolute top-4 right-4 text-slate-400 hover:text-white p-1">✕</button>
        <div class="text-center mb-6">
          <h3 class="text-xl font-bold text-white">Select User Role / Sign In</h3>
          <p class="text-xs text-slate-400 mt-1">Select a role to instantly switch authentication context</p>
        </div>
        <div class="space-y-3 mb-6">
          <button onclick="window.quickSignIn('admin@winedistribution.be', 'admin123')" class="w-full bg-slate-800 hover:bg-slate-750 border border-amber-500/40 p-3 rounded-xl flex items-center justify-between text-left group transition">
            <div>
              <div class="text-sm font-bold text-amber-400">👑 Admin Manager</div>
              <div class="text-xs text-slate-400 font-mono">admin@winedistribution.be</div>
            </div>
            <span class="text-xs bg-amber-500 text-slate-950 px-2 py-1 rounded font-bold">Sign In</span>
          </button>
          <button onclick="window.quickSignIn('evaluator@winedistribution.be', 'eval123')" class="w-full bg-slate-800 hover:bg-slate-750 border border-emerald-500/40 p-3 rounded-xl flex items-center justify-between text-left group transition">
            <div>
              <div class="text-sm font-bold text-emerald-400">📋 Field Evaluator</div>
              <div class="text-xs text-slate-400 font-mono">evaluator@winedistribution.be</div>
            </div>
            <span class="text-xs bg-emerald-500 text-slate-950 px-2 py-1 rounded font-bold">Sign In</span>
          </button>
          <button onclick="window.quickSignIn('depot@winedistribution.be', 'depot123')" class="w-full bg-slate-800 hover:bg-slate-750 border border-sky-500/40 p-3 rounded-xl flex items-center justify-between text-left group transition">
            <div>
              <div class="text-sm font-bold text-sky-400">📦 Depot Dispatch Staff</div>
              <div class="text-xs text-slate-400 font-mono">depot@winedistribution.be</div>
            </div>
            <span class="text-xs bg-sky-500 text-slate-950 px-2 py-1 rounded font-bold">Sign In</span>
          </button>
        </div>
        <div class="border-t border-slate-800 pt-4">
          <form onsubmit="window.customSignIn(event)" class="space-y-3">
            <div>
              <label class="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">Or Sign In With Custom Email</label>
              <input type="email" id="custom-email" placeholder="user@winedistribution.be" required class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <input type="password" id="custom-password" placeholder="Password" required class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500" />
            </div>
            <div id="modal-error" class="hidden text-xs text-rose-400 bg-rose-950/40 border border-rose-800 p-2 rounded"></div>
            <button type="submit" id="custom-submit-btn" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2 rounded-lg transition border border-slate-700">
              Sign In Custom User
            </button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.classList.remove('hidden');
};

window.quickSignIn = async function(email, password) {
  const modal = document.getElementById('demo-login-modal');
  const errorBox = document.getElementById('modal-error');
  if (errorBox) errorBox.classList.add('hidden');
  try {
    await signInWithEmailAndPassword(auth, email, password);
    if (modal) modal.classList.add('hidden');
  } catch (err) {
    // If user does not exist yet in Auth, try creating or show error
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      try {
        const { createUserWithEmailAndPassword } = await import('./firebase-config.js');
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        let role = 'evaluator';
        if (email.includes('admin')) role = 'admin';
        else if (email.includes('depot')) role = 'depot';
        await setDoc(doc(db, 'users', userCred.user.uid), {
          uid: userCred.user.uid,
          email: email,
          role: role,
          createdAt: new Date().toISOString()
        });
        if (modal) modal.classList.add('hidden');
        return;
      } catch (createErr) {
        console.error("Auto registration error:", createErr);
      }
    }
    if (errorBox) {
      errorBox.textContent = `Sign in error: ${err.message}`;
      errorBox.classList.remove('hidden');
    }
  }
};

window.customSignIn = async function(e) {
  e.preventDefault();
  const email = document.getElementById('custom-email').value.trim();
  const password = document.getElementById('custom-password').value.trim();
  await window.quickSignIn(email, password);
};
