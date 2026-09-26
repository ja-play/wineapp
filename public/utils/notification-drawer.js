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

// Clean leading emojis or symbols from titles so double icons never appear
function cleanTitle(title) {
  if (!title) return '';
  return String(title).replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '').trim();
}

/** Render/mount the bell button in the navigation header */
export function renderNotifBell() {
  if (!_userId) return;

  // Prefer dedicated slot in setupAuthUI, fallback to auth-bar-container
  let container = document.getElementById('notif-bell-container');
  if (!container) {
    container = document.getElementById('auth-bar-container');
  }

  if (!container) {
    // Retry once header/auth-bar is ready
    const observer = new MutationObserver(() => {
      const target = document.getElementById('notif-bell-container') || document.getElementById('auth-bar-container');
      if (target) {
        observer.disconnect();
        renderNotifBell();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return;
  }

  // If bell already exists inside this container, just update badge
  let bellBtn = document.getElementById('notif-bell-btn');
  if (bellBtn && container.contains(bellBtn)) {
    updateBadge();
    return;
  }

  // Remove any orphaned portal button elsewhere
  document.getElementById('notif-bell-portal')?.remove();

  const bellWrapper = document.createElement('div');
  bellWrapper.id = 'notif-bell-portal';
  bellWrapper.style.cssText = 'display: inline-flex; align-items: center; margin-right: 4px;';
  bellWrapper.innerHTML = `
    <button id="notif-bell-btn" type="button" onclick="window.toggleNotifDrawer()"
      aria-label="Notifications"
      title="Notifications"
      style="
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        color: #1e242b;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      "
      onmouseover="this.style.background='#fff1f2'; this.style.borderColor='#fca5a5'; this.style.color='#ba1628';"
      onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#e2e8f0'; this.style.color='#1e242b';"
      onfocus="this.style.outline='none'; this.style.boxShadow='0 0 0 2px rgba(186, 22, 40, 0.2)';"
      onblur="this.style.boxShadow='none';">
      <svg style="width: 19px; height: 19px; display: block;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
      </svg>
      <span id="notif-badge"
        style="
          display: none;
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 17px;
          height: 17px;
          padding: 0 4px;
          background: #BA1628;
          color: #ffffff;
          font-size: 9.5px;
          font-weight: 800;
          border-radius: 9px;
          border: 2px solid #ffffff;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
          font-family: 'Plus Jakarta Sans', sans-serif;
        ">
        0
      </span>
    </button>
  `;

  // Prepend to container so it sits in front of the role badge
  container.prepend(bellWrapper);
  updateBadge();
}

window.renderNotifBell = renderNotifBell;

function updateBadge() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  const unreadCount = _notifications.filter(n => !n.read).length;
  if (unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

/** Inject drawer panel and backdrop into document.body */
function injectDrawerHTML() {
  renderNotifBell();

  if (document.getElementById('notif-drawer')) return;

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'notif-backdrop';
  backdrop.onclick = () => window.closeNotifDrawer();
  backdrop.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    backdrop-filter: blur(2px); z-index: 9998; display: none;
    transition: opacity 0.25s; opacity: 0;
  `;
  document.body.appendChild(backdrop);

  // Drawer panel
  const drawer = document.createElement('div');
  drawer.id = 'notif-drawer';
  drawer.style.cssText = `
    position: fixed; top: 0; right: 0; height: 100vh; width: 380px; max-width: 95vw;
    background: #ffffff; z-index: 9999; transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex; flex-direction: column;
    box-shadow: -4px 0 40px rgba(0,0,0,0.2);
  `;
  drawer.innerHTML = `
    <!-- Drawer Header -->
    <div style="background: linear-gradient(135deg, #1E242B 0%, #BA1628 100%); padding: 18px 20px; flex-shrink: 0;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <svg style="width: 20px; height: 20px; color: #f8b400; flex-shrink: 0;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          <span style="color: #ffffff; font-weight: 800; font-size: 15px; letter-spacing: 0.3px; font-family: 'Plus Jakarta Sans', sans-serif;">
            Notifications
          </span>
        </div>
        <button onclick="window.closeNotifDrawer()"
          type="button"
          aria-label="Close"
          style="background: rgba(255,255,255,0.15); border: none; color: #ffffff; width: 28px; height: 28px;
            border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;"
          onmouseover="this.style.background='rgba(255,255,255,0.25)'"
          onmouseout="this.style.background='rgba(255,255,255,0.15)'">
          <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span id="notif-drawer-count" style="color: rgba(255,255,255,0.75); font-size: 11px; font-family: 'Plus Jakarta Sans', sans-serif;">
          Loading...
        </span>
        <button id="notif-mark-all-btn" onclick="window.markAllRead()"
          type="button"
          style="background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.2); color: #ffffff; font-size: 10px;
            font-weight: 700; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif;
            letter-spacing: 0.3px; transition: background 0.2s;"
          onmouseover="this.style.background='rgba(255,255,255,0.3)'"
          onmouseout="this.style.background='rgba(255,255,255,0.18)'">
          Mark all read
        </button>
      </div>
    </div>

    <!-- Notification List -->
    <div id="notif-list"
      style="flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px;
        background: #f8fafc; scrollbar-width: thin;">
      <div id="notif-loading" style="display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8; font-size: 12px; font-family: 'Plus Jakarta Sans', sans-serif;">
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
    if (backdrop) {
      backdrop.style.display = 'block';
      setTimeout(() => { backdrop.style.opacity = '1'; }, 10);
    }
  }
};

window.closeNotifDrawer = function () {
  const drawer = document.getElementById('notif-drawer');
  const backdrop = document.getElementById('notif-backdrop');
  if (!drawer) return;
  drawer.style.transform = 'translateX(100%)';
  if (backdrop) {
    backdrop.style.opacity = '0';
    setTimeout(() => { backdrop.style.display = 'none'; }, 260);
  }
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

// Return high-quality SVG icon & colors for each notification type
function getNotificationTheme(type) {
  switch (type) {
    case 'order_submitted':
      return {
        svg: `<svg style="width: 17px; height: 17px; color: #b45309;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
              </svg>`,
        badgeBg: '#fef3c7',
        badgeBorder: '#fde68a',
        accentColor: '#d97706',
        cardBgUnread: '#fffbeb',
        cardBorderUnread: '#fde68a'
      };
    case 'order_cancelled':
      return {
        svg: `<svg style="width: 17px; height: 17px; color: #BA1628;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>`,
        badgeBg: '#fff1f2',
        badgeBorder: '#fecaca',
        accentColor: '#BA1628',
        cardBgUnread: '#fff5f5',
        cardBorderUnread: '#fecaca'
      };
    case 'low_stock':
      return {
        svg: `<svg style="width: 17px; height: 17px; color: #c2410c;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>`,
        badgeBg: '#ffedd5',
        badgeBorder: '#fed7aa',
        accentColor: '#ea580c',
        cardBgUnread: '#fff7ed',
        cardBorderUnread: '#fed7aa'
      };
    case 'contact_form':
    default:
      return {
        svg: `<svg style="width: 17px; height: 17px; color: #2563eb;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>`,
        badgeBg: '#eff6ff',
        badgeBorder: '#bfdbfe',
        accentColor: '#3b82f6',
        cardBgUnread: '#f0f7ff',
        cardBorderUnread: '#bfdbfe'
      };
  }
}

/** Render notification list */
function renderNotifications(notifications) {
  const list = document.getElementById('notif-list');
  const countEl = document.getElementById('notif-drawer-count');

  updateBadge();

  if (!list) return;

  const unreadCount = notifications.filter(n => !n.read).length;

  // Update count label
  if (countEl) {
    countEl.textContent = unreadCount > 0
      ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
      : notifications.length > 0 ? 'All caught up ✓' : 'No notifications yet';
  }

  if (notifications.length === 0) {
    list.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:12px; color:#94a3b8; padding: 40px 20px;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center;">
          <svg style="width:24px; height:24px; color:#94a3b8;" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </div>
        <p style="font-size:13px; font-weight:700; color: #475569; font-family:'Plus Jakarta Sans',sans-serif; margin: 0;">You're all caught up!</p>
        <p style="font-size:11px; text-align:center; max-width:240px; line-height:1.5; color: #94a3b8; margin: 0;">No notifications yet. Real-time alerts for orders, cancellations, and low stock will appear here.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = notifications.map(n => {
    const theme = getNotificationTheme(n.type);
    const ts = n.createdAt?.toDate ? n.createdAt.toDate() : (n.createdAt ? new Date(n.createdAt) : new Date());
    const relTime = getRelativeTime(ts);
    const isUnread = !n.read;
    const cleanTitleText = cleanTitle(n.title);

    return `
      <div onclick="window.markNotifRead('${n.id}')"
        style="
          background: ${isUnread ? theme.cardBgUnread : '#ffffff'};
          border: 1px solid ${isUnread ? theme.cardBorderUnread : '#e2e8f0'};
          border-radius: 12px; padding: 12px 14px; cursor: pointer;
          transition: box-shadow 0.2s, border-color 0.2s, transform 0.15s;
          display: flex; gap: 12px; align-items: flex-start;
          box-shadow: ${isUnread ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'};
          position: relative;
        "
        onmouseover="this.style.boxShadow='0 4px 14px rgba(0,0,0,0.08)';"
        onmouseout="this.style.boxShadow='${isUnread ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'}';">

        ${isUnread ? `<span style="position:absolute; top:12px; right:12px; width:8px; height:8px; border-radius:50%; background:${theme.accentColor}; display:block;"></span>` : ''}

        <!-- Icon badge -->
        <div style="
          width: 34px; height: 34px; border-radius: 10px;
          background: ${theme.badgeBg};
          border: 1px solid ${theme.badgeBorder};
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 1px;
        ">
          ${theme.svg}
        </div>

        <div style="flex: 1; min-width: 0; padding-right: ${isUnread ? '12px' : '0'};">
          <p style="font-weight: ${isUnread ? '800' : '600'}; font-size: 12px; color: #1e293b; margin: 0 0 3px 0;
            font-family: 'Plus Jakarta Sans', sans-serif; line-height: 1.4;">
            ${escapeHtml(cleanTitleText)}
          </p>
          <p style="font-size: 11px; color: #64748b; margin: 0 0 6px 0; line-height: 1.5;
            font-family: 'Plus Jakarta Sans', sans-serif;">
            ${escapeHtml(n.message || '')}
          </p>
          <p style="font-size: 10px; color: #94a3b8; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;">
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
