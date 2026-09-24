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

  const currentPath = window.location.pathname.toLowerCase();

  const isCatalog = currentPath.endsWith('index.html') || currentPath.endsWith('/') || currentPath === '' || (!currentPath.includes('admin') && !currentPath.includes('depot') && !currentPath.includes('contact'));
  const isDepot = currentPath.includes('depot');
  const isAdmin = currentPath.includes('admin');
  const isContact = currentPath.includes('contact');

  const navLinkClass = (active) => active
    ? 'text-xs bg-[#BA1628] text-white font-bold px-3 py-1.5 rounded-xl shadow transition flex items-center gap-1.5'
    : 'text-xs bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-[#BA1628] border border-slate-200 font-medium px-3 py-1.5 rounded-xl transition flex items-center gap-1.5';

  if (!user) {
    container.innerHTML = `
      <nav class="flex items-center gap-2">
        <a href="index.html" class="${navLinkClass(isCatalog)}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
          <span>Catalog</span>
        </a>
        <a href="contact.html" class="${navLinkClass(isContact)}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          <span>Contact</span>
        </a>
        <button onclick="window.showLoginModal()" class="btn-gold font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow">
          <span>Sign In</span>
        </button>
      </nav>
    `;
    return;
  }

  const roleColors = {
    admin: 'bg-rose-50 text-[#BA1628] border-rose-200',
    evaluator: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    depot: 'bg-purple-50 text-purple-800 border-purple-200'
  };

  const roleSvgIcons = {
    admin: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/></svg>`,
    evaluator: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>`,
    depot: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`
  };

  const userIdentity = user.email || user.uid || 'User';

  container.innerHTML = `
    <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
      <nav class="flex items-center gap-1.5 sm:gap-2">
        <a href="index.html" class="${navLinkClass(isCatalog)}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
          <span>Catalog</span>
        </a>
        ${isCatalog ? `
          <button onclick="window.openEvaluatorOrdersModal()" class="text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-1.5 rounded-xl transition shadow flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-amber-800" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            <span>My Orders</span>
          </button>
        ` : ''}
        ${userRole === 'depot' || userRole === 'admin' ? `
          <a href="depot.html" class="${navLinkClass(isDepot)}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            <span>Depot</span>
          </a>
        ` : ''}
        ${userRole === 'admin' ? `
          <a href="admin.html" class="${navLinkClass(isAdmin)}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span>Admin</span>
          </a>
        ` : ''}
        <a href="contact.html" class="${navLinkClass(isContact)}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          <span>Contact</span>
        </a>
      </nav>

      <div class="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block"></div>

      <div class="flex items-center gap-2">
        <div title="Logged in as ${userIdentity} (${userRole.toUpperCase()})" class="flex items-center gap-1.5 text-xs border px-2.5 py-1 rounded-xl shadow-sm transition ${roleColors[userRole] || roleColors.evaluator}">
          <span class="flex items-center justify-center">${roleSvgIcons[userRole] || roleSvgIcons.evaluator}</span>
          <span class="font-mono text-[11px] font-bold max-w-[130px] sm:max-w-[170px] truncate">${userIdentity}</span>
        </div>
        <button onclick="window.handleAuthSignOut()" class="bg-rose-50 hover:bg-rose-100 text-[#BA1628] text-xs px-3 py-1.5 rounded-xl border border-rose-200 font-bold transition">
          Sign Out
        </button>
      </div>
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
