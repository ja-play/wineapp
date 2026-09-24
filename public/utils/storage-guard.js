/**
 * Storage & XPCOM Safety Guard for Aurellion Wine Application
 * Prevents Firefox NS_ERROR_FAILURE exceptions during tab teardown/unload
 * and configures Sentry to suppress false-positive browser storage errors.
 */

(function () {
  if (typeof window === 'undefined') return;

  // 1. Guard Storage.prototype methods against Firefox XPCOM NS_ERROR_FAILURE
  if (typeof Storage !== 'undefined') {
    const methods = ['removeItem', 'setItem', 'getItem', 'clear'];
    methods.forEach((method) => {
      try {
        const original = Storage.prototype[method];
        if (typeof original === 'function') {
          Storage.prototype[method] = function (...args) {
            try {
              return original.apply(this, args);
            } catch (err) {
              if (err && (err.name === 'NS_ERROR_FAILURE' || String(err).includes('NS_ERROR_FAILURE'))) {
                return null;
              }
              throw err;
            }
          };
        }
      } catch (e) {
        // Prototype modification may be sealed in some environments
      }
    });
  }

  // 2. Guard StorageEvent.prototype.storageArea against Firefox XPCOM exception
  if (typeof StorageEvent !== 'undefined') {
    try {
      const desc = Object.getOwnPropertyDescriptor(StorageEvent.prototype, 'storageArea');
      if (desc && desc.get) {
        Object.defineProperty(StorageEvent.prototype, 'storageArea', {
          get() {
            try {
              return desc.get.call(this);
            } catch (err) {
              return null;
            }
          },
          configurable: true,
          enumerable: true
        });
      }
    } catch (e) {
      // Ignore if not configurable
    }
  }

  // 3. Configure Sentry loader callback to filter NS_ERROR_FAILURE and browser extension noise
  window.sentryOnLoad = function () {
    if (typeof window.Sentry !== 'undefined' && typeof window.Sentry.init === 'function') {
      window.Sentry.init({
        ignoreErrors: [
          'NS_ERROR_FAILURE',
          'NS_ERROR_NOT_INITIALIZED',
          'SecurityError: The operation is insecure',
          /NS_ERROR_FAILURE/i
        ],
        denyUrls: [
          /extensions\//i,
          /^chrome:\/\//i
        ],
        beforeSend(event, hint) {
          const error = hint && hint.originalException;
          if (error) {
            const errStr = String(error.message || error.name || error);
            if (errStr.includes('NS_ERROR_FAILURE') || errStr.includes('NS_ERROR_NOT_INITIALIZED')) {
              return null; // Drop event
            }
          }
          return event;
        }
      });
    }
  };
})();
