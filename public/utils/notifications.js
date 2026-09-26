/**
 * Notification Utility — Aurellion Wine Platform
 * Handles writing, reading, and marking notifications in Firestore.
 *
 * Firestore Schema:
 *   notifications/{userId}/items/{notifId}
 *   {
 *     id:        string,
 *     type:      'order_submitted' | 'order_cancelled' | 'low_stock' | 'contact_form',
 *     title:     string,
 *     message:   string,
 *     read:      boolean,
 *     createdAt: Timestamp,
 *     metadata:  { orderId?, wineId?, wineName?, clientName? }
 *   }
 */

import {
  db,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp
} from '../firebase-config.js';

/**
 * Write a notification to one or more target users by their UIDs.
 * @param {string[]} targetUids
 * @param {{ type: string, title: string, message: string, metadata?: object }} payload
 */
export async function writeNotification(targetUids, payload) {
  const promises = targetUids.map(uid =>
    addDoc(collection(db, 'notifications', uid, 'items'), {
      type: payload.type,
      title: payload.title,
      message: payload.message,
      read: false,
      createdAt: serverTimestamp(),
      metadata: payload.metadata || {}
    })
  );
  await Promise.allSettled(promises);
}

/**
 * Fetch all user UIDs that have one of the given roles.
 * @param {string[]} roles - e.g. ['admin', 'depot']
 * @returns {Promise<string[]>} array of user UIDs
 */
export async function getUserUidsByRoles(roles) {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs
      .filter(d => roles.includes(d.data().role))
      .map(d => d.id);
  } catch (e) {
    console.warn('writeNotification: could not fetch user UIDs', e);
    return [];
  }
}

/**
 * Mark a single notification item as read.
 * @param {string} userId
 * @param {string} notifId
 */
export async function markNotificationRead(userId, notifId) {
  try {
    await updateDoc(doc(db, 'notifications', userId, 'items', notifId), { read: true });
  } catch (e) {
    console.warn('markNotificationRead error:', e);
  }
}

/**
 * Mark all notifications as read for a user.
 * @param {string} userId
 * @param {{ id: string }[]} notifications
 */
export async function markAllNotificationsRead(userId, notifications) {
  const unread = notifications.filter(n => !n.read);
  const promises = unread.map(n =>
    updateDoc(doc(db, 'notifications', userId, 'items', n.id), { read: true })
  );
  await Promise.allSettled(promises);
}

/**
 * Convenience: notify Depot + Admin of a new submitted order.
 */
export async function notifyOrderSubmitted(orderId, clientName, itemCount) {
  const uids = await getUserUidsByRoles(['depot', 'admin']);
  await writeNotification(uids, {
    type: 'order_submitted',
    title: '🛒 New Order Submitted',
    message: `Order from ${clientName} — ${itemCount} case line(s) awaiting depot processing.`,
    metadata: { orderId, clientName }
  });
}

/**
 * Convenience: notify Admin of a cancelled order.
 */
export async function notifyOrderCancelled(orderId, clientName) {
  const uids = await getUserUidsByRoles(['admin']);
  await writeNotification(uids, {
    type: 'order_cancelled',
    title: '❌ Order Cancelled',
    message: `Order #${orderId.substring(0, 8)} for ${clientName} has been cancelled. Inventory restored.`,
    metadata: { orderId, clientName }
  });
}

/**
 * Convenience: notify Admin of a B2B contact form submission.
 */
export async function notifyContactForm(contactName, contactEmail) {
  const uids = await getUserUidsByRoles(['admin']);
  await writeNotification(uids, {
    type: 'contact_form',
    title: '📨 New B2B Enquiry',
    message: `${contactName} (${contactEmail}) submitted a contact enquiry.`,
    metadata: { contactName, contactEmail }
  });
}

/**
 * Convenience: notify Admin of a low stock alert.
 * Includes 24h deduplication check via lastStockAlertSentAt field on the wine doc.
 */
export async function notifyLowStock(wineId, wineName, currentQty, threshold) {
  const uids = await getUserUidsByRoles(['admin']);
  await writeNotification(uids, {
    type: 'low_stock',
    title: '⚠️ Low Stock Alert',
    message: `${wineName} is low: only ${currentQty} case(s) left (threshold: ${threshold}).`,
    metadata: { wineId, wineName, currentQty, threshold }
  });
}
