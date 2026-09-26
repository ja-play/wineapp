/**
 * Notification Drawer — Aurellion Wine Platform
 * A right-side slide-in drawer showing real-time per-user notifications.
 *
 * Usage:
 *   import { initNotificationDrawer } from './utils/notification-drawer.js';
 *   // Call after auth resolves with the signed-in user:
 *   initNotificationDrawer(user);
 */

import {
  db,
  collection,
  onSnapshot,
  query,
  orderBy
} from '../firebase-config.js';
import {
  markNotificationRead,
  markAllNotificationsRead
} from './notifications.js';

let _userId = null;
let _notifications = [];
let _unsubscribe = null;

/** Inject the drawer HTML + bell button into the DOM */
function injectDrawerHTML() {
  if (document.getElementById('notif-drawer')) return;

  // Bell button — injected into #auth-bar-container (layout.js renders this)
  // We use a portal approach: append to body and position absolutely
  const bellBtn = document.createElement('div');
  bellBtn.id = 'notif-bell-portal';
  bellBtn.style.cssText = 'position:fixed;top:14px;right:80px;z-index:9000;';
  bellBtn.innerHTML = `
    <button id="notif-bell-btn" onclick="window.toggleNotifDrawer()"
      aria-label="Notifications"
      class="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition shadow-md">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
      </svg>
      <span id="notif-badge"
        class="hidden absolute -top-1 -right-1 w-4 h-4 bg-[#BA1628] text-white text-[9px] font-extrabold rounded-full flex items-center justify-center border border-white shadow">
        0
      </span>
    </button>
  `;
  document.body.appendChild(bellBtn);

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'notif-backdrop';
  backdrop.onclick = () => window.closeNotifDrawer();
  backdrop.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.35);
    backdrop-filter: blur(2px); z-index: 9998; display: none;
    transition: opacity 0.25s;
  `;
  document.body.appendChild(backdrop);

  // Drawer panel
  const drawer = document.createElement('div');
  drawer.id = 'notif-drawer';
  drawer.style.cssText = `
    position: fixed; top: 0; right: 0; height: 100vh; width: 380px; max-width: 95vw;
    background: #fff; z-index: 9999; transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    display: flex; flex-direction: column;
    box-shadow: -4px 0 40px rgba(0,0,0,0.18);
  `;
  drawer.innerHTML = `
    <!-- Drawer Header -->
    <div style="background: linear-gradient(135deg,#1E242B 0%,#BA1628 100%); padding: 20px 20px 18px; flex-shrink:0;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <svg style="width:20px;height:20px;color:#f8b400;flex-shrink:0;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          <span style="color:#fff; font-weight:800; font-size:15px; letter-spacing:0.3px; font-family:'Plus Jakarta Sans',sans-serif;">
            Notifications
          </span>
        </div>
        <button onclick="window.closeNotifDrawer()"
          style="background:rgba(255,255,255,0.15); border:none; color:#fff; width:30px; height:30px;
            border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s;"
          onmouseover="this.style.background='rgba(255,255,255,0.25)'"
          onmouseout="this.style.background='rgba(255,255,255,0.15)'">
          <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <span id="notif-drawer-count" style="color:rgba(255,255,255,0.7); font-size:11px; font-family:'Plus Jakarta Sans',sans-serif;">
          Loading...
        </span>
        <button id="notif-mark-all-btn" onclick="window.markAllRead()"
          style="background:rgba(255,255,255,0.15); border:none; color:rgba(255,255,255,0.85); font-size:10px;
            font-weight:700; padding:4px 10px; border-radius:6px; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif;
            letter-spacing:0.3px; transition:background 0.2s;"
          onmouseover="this.style.background='rgba(255,255,255,0.25)'"
          onmouseout="this.style.background='rgba(255,255,255,0.15)'">
          Mark all read
        </button>
      </div>
    </div>

    <!-- Notification List -->
    <div id="notif-list"
      style="flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:8px;
        background:#f8fafc; scrollbar-width:thin;">
      <div id="notif-loading" style="display:flex; align-items:center; justify-content:center; height:100%; color:#94a3b8; font-size:12px; font-family:'Plus Jakarta Sans',sans-serif;">
        Loading notifications...
      </div>
    </div>
  `;
  document.body.appendChild(drawer);

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.closeNotifDrawer();
  });
}

/** Toggle the drawer open/closed */
window.toggleNotifDrawer = function () {
  const drawer = document.getElementById('notif-drawer');
  const backdrop = document.getElementById('notif-backdrop');
  if (!drawer) return;
  const isOpen = drawer.style.transform === 'translateX(0px)';
  if (isOpen) {
    window.closeNotifDrawer();
  } else {
    drawer.style.transform = 'translateX(0px)';
    backdrop.style.display = 'block';
    setTimeout(() => { backdrop.style.opacity = '1'; }, 10);
  }
};

window.closeNotifDrawer = function () {
  const drawer = document.getElementById('notif-drawer');
  const backdrop = document.getElementById('notif-backdrop');
  if (!drawer) return;
  drawer.style.transform = 'translateX(100%)';
  backdrop.style.opacity = '0';
  setTimeout(() => { backdrop.style.display = 'none'; }, 300);
};

/** Mark all as read */
window.markAllRead = async function () {
  if (!_userId) return;
  await markAllNotificationsRead(_userId, _notifications);
};

/** Mark individual notification as read */
window.markNotifRead = async function (notifId) {
  if (!_userId) return;
  await markNotificationRead(_userId, notifId);
};

/** Render notification list */
function renderNotifications(notifications) {
  const list = document.getElementById('notif-list');
  const countEl = document.getElementById('notif-drawer-count');
  const badge = document.getElementById('notif-badge');

  if (!list) return;

  const unreadCount = notifications.filter(n => !n.read).length;

  // Update badge
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // Update count label
  if (countEl) {
    countEl.textContent = unreadCount > 0
      ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
      : notifications.length > 0 ? 'All caught up ✓' : 'No notifications yet';
  }

  if (notifications.length === 0) {
    list.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:12px; color:#94a3b8;">
        <svg style="width:40px;height:40px; opacity:0.4;" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        <p style="font-size:13px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif;">You're all caught up!</p>
        <p style="font-size:11px; text-align:center; max-width:200px; line-height:1.5;">No notifications yet. Alerts for new orders, cancellations and stock will appear here.</p>
      </div>
    `;
    return;
  }

  const iconMap = {
    order_submitted: { icon: '🛒', color: '#f59e0b', bg: '#fef3c7', border: '#fcd34d' },
    order_cancelled: { icon: '❌', color: '#BA1628', bg: '#fff1f2', border: '#fecaca' },
    low_stock:       { icon: '⚠️', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    contact_form:    { icon: '📨', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' }
  };

  list.innerHTML = notifications.map(n => {
    const theme = iconMap[n.type] || iconMap.contact_form;
    const ts = n.createdAt?.toDate ? n.createdAt.toDate() : (n.createdAt ? new Date(n.createdAt) : new Date());
    const relTime = getRelativeTime(ts);
    const isUnread = !n.read;

    return `
      <div onclick="window.markNotifRead('${n.id}')"
        style="
          background: ${isUnread ? theme.bg : '#fff'};
          border: 1px solid ${isUnread ? theme.border : '#e2e8f0'};
          border-radius: 12px; padding: 12px 14px; cursor: pointer;
          transition: box-shadow 0.2s, border-color 0.2s;
          display:flex; gap:12px; align-items:flex-start;
          box-shadow: ${isUnread ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'};
          position:relative;
        "
        onmouseover="this.style.boxShadow='0 4px 14px rgba(0,0,0,0.1)'"
        onmouseout="this.style.boxShadow='${isUnread ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'}'">
        ${isUnread ? `<span style="position:absolute;top:10px;right:10px;width:7px;height:7px;border-radius:50%;background:${theme.color};display:block;"></span>` : ''}
        <span style="font-size:20px; flex-shrink:0; margin-top:1px;">${theme.icon}</span>
        <div style="flex:1; min-width:0;">
          <p style="font-weight:${isUnread ? '700' : '600'}; font-size:12px; color:#1e293b; margin:0 0 3px 0;
            font-family:'Plus Jakarta Sans',sans-serif; line-height:1.4;">
            ${escapeHtml(n.title || '')}
          </p>
          <p style="font-size:11px; color:#64748b; margin:0 0 6px 0; line-height:1.5;
            font-family:'Plus Jakarta Sans',sans-serif;">
            ${escapeHtml(n.message || '')}
          </p>
          <p style="font-size:10px; color:#94a3b8; margin:0; font-family:'Plus Jakarta Sans',sans-serif;">
            ${relTime}
          </p>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getRelativeTime(date) {
  if (!date) return '';
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60)   return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60)   return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)    return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

/**
 * Initialize the notification drawer for a signed-in user.
 * Call this once after auth resolves.
 * @param {import('firebase/auth').User} user
 */
export function initNotificationDrawer(user) {
  if (!user) return;
  _userId = user.uid;

  injectDrawerHTML();

  // Clean up previous listener if re-initializing
  if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }

  const notifQuery = query(
    collection(db, 'notifications', _userId, 'items'),
    orderBy('createdAt', 'desc')
  );

  _unsubscribe = onSnapshot(notifQuery, (snapshot) => {
    _notifications = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderNotifications(_notifications);
  }, (err) => {
    console.warn('Notification listener error:', err);
  });
}

/** Clean up listener (call on sign-out) */
export function destroyNotificationDrawer() {
  if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
  _userId = null;
  _notifications = [];
  document.getElementById('notif-bell-portal')?.remove();
  document.getElementById('notif-drawer')?.remove();
  document.getElementById('notif-backdrop')?.remove();
}
