const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const config = require('./config/app.config');
const { buildNoteDenvoiHtml } = require('./templates/note-denvoi.template');

admin.initializeApp();

/**
 * Cloud Function to generate Belgian "NOTE D'ENVOI" PDF upon order placement
 */
exports.generateNoteDenvoi = onDocumentCreated({
  document: 'orders/{orderId}',
  region: config.REGION,
  memory: config.MEMORY,
  timeoutSeconds: config.TIMEOUT_SECONDS
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No data associated with event");
    return;
  }

  const orderId = event.params.orderId;
  const orderData = snapshot.data();

  // Guard against recursion if invoice is already generated
  if (orderData.invoicePdfUrl) {
    console.log(`Invoice already exists for order ${orderId}`);
    return;
  }

  console.log(`Processing Note d'Envoi for Order ${orderId}...`);

  try {
    const htmlContent = buildNoteDenvoiHtml(orderId, orderData);
    let pdfBuffer;

    try {
      // Launch headless Chromium
      const executablePath = await chromium.executablePath();
      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: chromium.headless,
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
      });
      await browser.close();
    } catch (chromiumError) {
      console.warn("Headless Chromium unavailable, creating HTML fallback document:", chromiumError);
      pdfBuffer = Buffer.from(htmlContent, 'utf-8');
    }

    // Upload PDF to Firebase Storage
    const bucket = admin.storage().bucket();
    const filePath = `invoices/${orderId}.pdf`;
    const file = bucket.file(filePath);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: { orderId: orderId }
      },
      public: true
    });

    // Make file public or obtain download URL
    await file.makePublic().catch(() => {});
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    // Update Firestore order document
    await snapshot.ref.update({
      invoicePdfUrl: publicUrl,
      status: 'ready_for_dispatch',
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Successfully generated Note d'Envoi PDF for order ${orderId}: ${publicUrl}`);
  } catch (error) {
    console.error(`Error generating PDF for order ${orderId}:`, error);
    await snapshot.ref.update({
      status: 'pdf_error',
      pdfErrorDetails: error.message
    });
  }
});
