import type { Metadata } from 'next';
import './globals.css';
import { Web3Provider } from '@/components/shared/Web3Provider';
import { LayoutShell } from '@/components/shared/LayoutShell';

export const metadata: Metadata = {
  title: 'Hybrid | Unified Web3 Gaming Dashboard',
  description: 'Jump into real-time Web3 gaming on Hemi Network with Hybrid. Battle for on-chain ELO in Hemi Chess and Hemi Connect 4 or sweep the chip pots in Hemi Crazy 8.',
  keywords: ['Hybrid', 'Hemi', 'Hemi Network', 'Web3 Gaming', 'Hemi Chess', 'Hemi Crazy 8', 'Hemi Connect 4', 'Arcade', 'Blockchain Gaming'],
  openGraph: {
    title: 'Hybrid | Unified Web3 Gaming Dashboard',
    description: 'Jump into real-time Web3 gaming on Hemi Network with Hybrid. Battle for on-chain ELO in Hemi Chess and Hemi Connect 4 or sweep the chip pots in Hemi Crazy 8.',
    type: 'website',
    siteName: 'Hybrid',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hybrid | Unified Web3 Gaming Dashboard',
    description: 'Jump into real-time Web3 gaming on Hemi Network with Hybrid. Battle for on-chain ELO in Hemi Chess and Hemi Connect 4 or sweep the chip pots in Hemi Crazy 8.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const walletGuardScript = `
    (function() {
      try {
        var origDefineProperty = Object.defineProperty;
        Object.defineProperty = function(target, prop, descriptor) {
          try {
            if (target && (typeof target === 'object' || typeof target === 'function')) {
              var existing = Object.getOwnPropertyDescriptor(target, prop);
              if (existing && !existing.configurable) {
                return target;
              }
              if (descriptor && typeof prop === 'string' && (prop.indexOf('is') === 0 || prop === 'ethereum' || prop === 'providers' || prop === 'zerionWallet')) {
                var cloned = {};
                for (var k in descriptor) {
                  if (Object.prototype.hasOwnProperty.call(descriptor, k)) {
                    cloned[k] = descriptor[k];
                  }
                }
                cloned.configurable = true;
                descriptor = cloned;
              }
            }
            return origDefineProperty.call(Object, target, prop, descriptor);
          } catch (e) {
            return target;
          }
        };

        var origDefineProperties = Object.defineProperties;
        Object.defineProperties = function(target, props) {
          try {
            if (target && props && typeof props === 'object') {
              var keys = Object.keys(props);
              for (var i = 0; i < keys.length; i++) {
                Object.defineProperty(target, keys[i], props[keys[i]]);
              }
              return target;
            }
            return origDefineProperties.call(Object, target, props);
          } catch (e) {
            return target;
          }
        };

        if (typeof window.fetch === 'function') {
          var origFetch = window.fetch.bind(window);
          window.fetch = function(input, init) {
            try {
              var url = typeof input === 'string' ? input : (input && input.url ? input.url : String(input || ''));
              if (
                url.indexOf('pulse.walletconnect.') !== -1 ||
                url.indexOf('api.web3modal.') !== -1 ||
                url.indexOf('cca-lite.coinbase.com') !== -1 ||
                url.indexOf('explorer-api.walletconnect.') !== -1
              ) {
                return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
              }
            } catch (e) {}
            return origFetch(input, init);
          };
        }

        window.addEventListener('error', function(event) {
          var msg = String((event && event.message) || (event && event.error && event.error.message) || '');
          var file = String((event && event.filename) || '');
          if (
            msg.indexOf('Cannot redefine property') !== -1 ||
            msg.indexOf('isZerion') !== -1 ||
            msg.indexOf('AnalyticsSDKApiError') !== -1 ||
            file.indexOf('chrome-extension://') !== -1
          ) {
            event.stopImmediatePropagation();
            event.preventDefault();
            return false;
          }
        }, true);

        window.addEventListener('unhandledrejection', function(event) {
          var reason = event && event.reason;
          var msg = String((reason && reason.message) || reason || '');
          if (
            msg.indexOf('Cannot redefine property') !== -1 ||
            msg.indexOf('isZerion') !== -1 ||
            msg.indexOf('AnalyticsSDKApiError') !== -1 ||
            msg.indexOf('pulse.walletconnect') !== -1
          ) {
            event.stopImmediatePropagation();
            event.preventDefault();
            return false;
          }
        }, true);

        var origConsoleError = console.error.bind(console);
        console.error = function() {
          try {
            var joined = Array.prototype.map.call(arguments, function(a) {
              if (typeof a === 'string') return a;
              if (a && a.message) return a.message;
              try { return JSON.stringify(a); } catch (e) { return String(a); }
            }).join(' ');
            if (
              joined.indexOf('AnalyticsSDKApiError') !== -1 ||
              joined.indexOf('Analytics SDK:') !== -1 ||
              joined.indexOf('Cannot redefine property: isZerion') !== -1 ||
              joined.indexOf('Cannot redefine property') !== -1
            ) {
              return;
            }
          } catch (e) {}
          return origConsoleError.apply(console, arguments);
        };
      } catch (e) {}
    })();
  `;

  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: walletGuardScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#08090C] text-slate-100 antialiased selection:bg-[#FF4600] selection:text-white">
        <Web3Provider>
          <LayoutShell>
            {children}
          </LayoutShell>
        </Web3Provider>
      </body>
    </html>
  );
}
