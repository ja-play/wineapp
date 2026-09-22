# WINE-2: Security Framework Testing Guide

This guide explains what the vulnerability was **Before**, how it behaves **Now**, and how you can manually verify each fix.

## 1. The Auth Guard Race Condition (Role Assignment)
* **Before:** When a user registered, the browser checked if the `users` collection was empty. If it was, or if the client-side code was tampered with, the user would automatically be granted the `admin` role.
* **Now:** The client-side code forces all new registrations to be assigned the `evaluator` role. 
* **How to test:**
  1. Go to the live site: https://wine-catalog-belgium.web.app
  2. Click **Sign In / Register** and create a brand new account.
  3. Once logged in, look at the badge in the top right navigation bar.
  4. **Expected Result:** It should say `📋 Evaluator` (not `👑 Admin`). 

## 2. Firestore Role Escalation Protection
* **Before:** Because users could edit their own profile document in Firestore, a malicious user could open the browser console and run a script to change their `role` field from `evaluator` to `admin`.
* **Now:** Firestore Rules explicitly block users from updating their own `role` field.
* **How to test:**
  1. Log in to the site as an `evaluator`.
  2. Open your browser's Developer Tools (F12) and go to the **Console** tab.
  3. Paste and run this script to attempt a hack:
     ```javascript
     import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js').then(async (firestore) => {
       const db = firestore.getFirestore();
       const auth = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js').then(a => a.getAuth());
       const userDoc = firestore.doc(db, 'users', auth.currentUser.uid);
       await firestore.updateDoc(userDoc, { role: 'admin' });
       console.log("Hack successful!");
     }).catch(console.error);
     ```
  4. **Expected Result:** You will get a red error in the console saying `FirebaseError: Missing or insufficient permissions.`, proving the database rejected the hack.

## 3. Security Headers
* **Before:** The website was served without modern HTTP security headers (like Content Security Policy), leaving it vulnerable to Clickjacking and Cross-Site Scripting (XSS).
* **Now:** Strict security headers are enforced by Firebase Hosting.
* **How to test:**
  1. Go to https://wine-catalog-belgium.web.app.
  2. Open Developer Tools (F12) and go to the **Network** tab.
  3. Refresh the page and click on the very first request (usually `wine-catalog-belgium.web.app` or `index.html`).
  4. Look at the **Response Headers** section on the right.
  5. **Expected Result:** You should now see headers like `content-security-policy`, `x-frame-options: DENY`, `x-content-type-options: nosniff`, and `x-xss-protection: 1; mode=block`.

## 4. Private PDF Invoices (Requires Firebase Console Setup)
* **Before:** When an order was placed, the backend generated a PDF and marked it as `public: true`. Anyone with the URL could view the invoice.
* **Now:** The backend generates a secure "Signed URL" (a complex link with a cryptographic signature). The bucket itself blocks public reads.
* **How to test (Once you enable Firebase Storage & upgrade to Blaze plan):**
  1. Place an order on the platform.
  2. Go to the Firebase Console -> Firestore Database -> `orders` collection.
  3. Find the newly created order and copy the `invoicePdfUrl`. 
  4. **Expected Result:** The URL will no longer be a simple `storage.googleapis.com/...` link. It will be a massive Signed URL containing `?GoogleAccessId=...&Expires=...&Signature=...`. If you try to access the file *without* that signature, you will get an Access Denied error.
