// Sentry Error Tracking Configuration
// Automatically captures unhandled exceptions, promise rejections, and console errors.

import * as Sentry from "https://browser.sentry-cdn.com/7.100.1/bundle.tracing.min.js";

Sentry.init({
  // TODO: Replace with your actual DSN from Sentry.io after creating a free project
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  
  // Integrations are loaded by default in the modern Sentry CDN bundles
  // depending on which bundle you use.
  
  // Performance Monitoring
  tracesSampleRate: 1.0, 
  
  // Session Replay
  replaysSessionSampleRate: 0.1, 
  replaysOnErrorSampleRate: 1.0, 
});

console.log("Sentry Error Tracking Initialized (Development Mode)");
