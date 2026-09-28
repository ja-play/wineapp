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
    try {
      await user.getIdToken();
    } catch (e) {
      console.warn("User token refresh warning:", e);
    }
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);
    
    if (userSnap.exists() && userSnap.data().role) {
      return userSnap.data().role;
    } else {
      const assignedRole = 'guest';

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
    return 'guest';
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
      <!-- Desktop nav (md+) -->
      <nav class="hidden md:flex items-center gap-2">
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
      <!-- Mobile hamburger (< md) -->
      <div class="flex md:hidden items-center gap-2">
        <button onclick="window.showLoginModal()" class="btn-gold font-bold text-xs px-3.5 py-1.5 rounded-xl transition shadow">Sign In</button>
        <button id="mobile-menu-btn" onclick="window.toggleMobileMenu()" class="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 border border-slate-200 text-slate-700 hover:text-[#BA1628] transition" aria-label="Menu">
          <svg id="mobile-menu-icon" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>
      <!-- Mobile side drawer backdrop -->
      <div id="mobile-menu-overlay" class="hidden fixed inset-0 z-[59]" style="background:rgba(0,0,0,0.45);" onclick="window.toggleMobileMenu()"></div>
      <!-- Mobile side drawer -->
      <div id="mobile-menu-panel" data-open="false" class="fixed top-0 right-0 h-full header-theme shadow-2xl z-[60] flex flex-col" style="width:280px;max-width:85vw;transform:translateX(110%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);">
        <div class="flex items-center justify-between px-5 py-4 border-b border-[#D4AF37]/20 flex-shrink-0">
          <span class="font-serif-title font-black text-base gold-gradient-text tracking-wide">AURELLION</span>
          <button onclick="window.toggleMobileMenu()" class="p-2 rounded-xl hover:bg-white/10 transition" aria-label="Close menu">
            <svg class="w-5 h-5" style="color:rgba(255,255,255,0.7)" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <nav class="flex flex-col gap-1 px-3 py-4 flex-grow overflow-y-auto min-h-0">
          <a href="index.html" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold w-full transition ${isCatalog ? 'bg-[#BA1628] text-white shadow' : 'text-white/90 hover:bg-white/10'}">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 22h8M12 15v7M5 3h14v4a7 7 0 0 1-14 0V3z"/></svg>
            Catalog
          </a>
          <a href="contact.html" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold w-full transition ${isContact ? 'bg-[#BA1628] text-white shadow' : 'text-white/90 hover:bg-white/10'}">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            Contact
          </a>
          <div class="border-t border-[#D4AF37]/20 my-2"></div>
          <button onclick="window.showLoginModal(); window.toggleMobileMenu();" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold w-full text-white/90 hover:bg-white/10 transition">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
            Sign In
          </button>
        </nav>
      </div>
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
    <!-- Desktop nav (md+) -->
    <div class="hidden md:flex items-center gap-2 sm:gap-3">
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
      <div class="h-4 w-px bg-slate-200 mx-0.5"></div>
      <div class="flex items-center gap-2">
        <div id="notif-bell-container-desktop" class="flex items-center"></div>
        <div title="Logged in as ${userIdentity} (${userRole.toUpperCase()})" class="flex items-center gap-1.5 text-xs border px-2.5 py-1 rounded-xl shadow-sm transition ${roleColors[userRole] || roleColors.evaluator}">
          <span class="flex items-center justify-center">${roleSvgIcons[userRole] || roleSvgIcons.evaluator}</span>
          <span class="font-mono text-[11px] font-bold max-w-[130px] sm:max-w-[170px] truncate">${userIdentity}</span>
        </div>
        <button onclick="window.handleAuthSignOut()" class="bg-rose-50 hover:bg-rose-100 text-[#BA1628] text-xs px-3 py-1.5 rounded-xl border border-rose-200 font-bold transition">Sign Out</button>
      </div>
    </div>

    <!-- Mobile: bell + hamburger (< md) -->
    <div class="flex md:hidden items-center gap-2">
      <div id="notif-bell-container" class="flex items-center"></div>
      <button id="mobile-menu-btn" onclick="window.toggleMobileMenu()" class="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 border border-slate-200 text-slate-700 hover:text-[#BA1628] transition" aria-label="Open menu">
        <svg id="mobile-menu-icon" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
    </div>
    <!-- Mobile side drawer backdrop -->
    <div id="mobile-menu-overlay" class="hidden fixed inset-0 z-[59]" style="background:rgba(0,0,0,0.45);" onclick="window.toggleMobileMenu()"></div>
    <!-- Mobile side drawer -->
    <div id="mobile-menu-panel" data-open="false" class="fixed top-0 right-0 h-full header-theme shadow-2xl z-[60] flex flex-col" style="width:280px;max-width:85vw;transform:translateX(110%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);">
      <div class="flex items-center justify-between px-5 py-4 border-b border-[#D4AF37]/20 flex-shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <div title="${userIdentity}" class="flex items-center gap-1.5 text-xs border px-2 py-1 rounded-xl ${roleColors[userRole] || roleColors.evaluator} min-w-0">
            <span class="flex-shrink-0">${roleSvgIcons[userRole] || roleSvgIcons.evaluator}</span>
            <span class="font-mono font-bold truncate max-w-[130px]">${userIdentity}</span>
          </div>
        </div>
        <button onclick="window.toggleMobileMenu()" class="p-2 rounded-xl hover:bg-white/10 transition flex-shrink-0" aria-label="Close menu">
          <svg class="w-5 h-5" style="color:rgba(255,255,255,0.7)" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <nav class="flex flex-col gap-1 px-3 py-4 flex-grow overflow-y-auto min-h-0">
        <a href="index.html" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold w-full transition ${isCatalog ? 'bg-[#BA1628] text-white shadow' : 'text-white/90 hover:bg-white/10'}">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 22h8M12 15v7M5 3h14v4a7 7 0 0 1-14 0V3z"/></svg>
          Catalog
        </a>
        ${isCatalog ? `
          <button onclick="window.openEvaluatorOrdersModal(); window.toggleMobileMenu();" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold w-full text-white/90 hover:bg-white/10 transition">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
            My Orders
          </button>
        ` : ''}
        ${userRole === 'depot' || userRole === 'admin' ? `
          <a href="depot.html" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold w-full transition ${isDepot ? 'bg-[#BA1628] text-white shadow' : 'text-white/90 hover:bg-white/10'}">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline stroke-linecap="round" stroke-linejoin="round" points="9 22 9 12 15 12 15 22"/></svg>
            Depot
          </a>
        ` : ''}
        ${userRole === 'admin' ? `
          <a href="admin.html" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold w-full transition ${isAdmin ? 'bg-[#BA1628] text-white shadow' : 'text-white/90 hover:bg-white/10'}">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            Admin
          </a>
        ` : ''}
        <a href="contact.html" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold w-full transition ${isContact ? 'bg-[#BA1628] text-white shadow' : 'text-white/90 hover:bg-white/10'}">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          Contact
        </a>
        <div class="border-t border-[#D4AF37]/20 my-2"></div>
        <button onclick="window.handleAuthSignOut()" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold w-full text-rose-300 hover:bg-rose-900/30 hover:text-rose-200 transition">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          Sign Out
        </button>
      </nav>
    </div>
  `;

  if (window.renderNotifBell) {
    window.renderNotifBell();
  }
}

window.toggleMobileMenu = function() {
  const panel = document.getElementById('mobile-menu-panel');
  const overlay = document.getElementById('mobile-menu-overlay');
  const icon = document.getElementById('mobile-menu-icon');
  if (!panel) return;

  const isOpen = panel.getAttribute('data-open') === 'true';

  if (isOpen) {
    // Slide out
    panel.style.transform = 'translateX(110%)';
    panel.setAttribute('data-open', 'false');
    if (overlay) overlay.classList.add('hidden');
    if (icon) icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>';
  } else {
    // Slide in
    if (overlay) overlay.classList.remove('hidden');
    panel.style.transform = 'translateX(0)';
    panel.setAttribute('data-open', 'true');
    if (icon) icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>';
  }
};

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
      let msg = 'Authentication failed. Please verify your email and password.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
        msg = 'Invalid email or password.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed login attempts. Please wait a few minutes and try again.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Network connection error. Please check your internet connection.';
      }
      errorBox.textContent = msg;
      errorBox.classList.remove('hidden');
    }
  }
};
