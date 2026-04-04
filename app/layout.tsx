import type { Metadata } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import { AppProviders } from "@/components/providers/AppProviders"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
})

export const metadata: Metadata = {
  title: "AgentCommerce | Autonomous AI Business Agents",
  description: "Launch AI agents that run businesses and earn revenue on-chain.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (typeof window !== 'undefined') {
                  var strippedHydrationAttrs = ['bis_skin_checked'];
                  var stripInjectedHydrationAttrs = function () {
                    try {
                      for (var i = 0; i < strippedHydrationAttrs.length; i += 1) {
                        var attr = strippedHydrationAttrs[i];
                        if (document.documentElement && document.documentElement.hasAttribute(attr)) {
                          document.documentElement.removeAttribute(attr);
                        }
                        if (document.body && document.body.hasAttribute(attr)) {
                          document.body.removeAttribute(attr);
                        }
                        var nodes = document.querySelectorAll('[' + attr + ']');
                        for (var j = 0; j < nodes.length; j += 1) {
                          nodes[j].removeAttribute(attr);
                        }
                      }
                    } catch (e) {}
                  };

                  stripInjectedHydrationAttrs();

                  var hydrationCleanupObserver = null;
                  try {
                    hydrationCleanupObserver = new MutationObserver(function () {
                      stripInjectedHydrationAttrs();
                    });
                    hydrationCleanupObserver.observe(document.documentElement, {
                      attributes: true,
                      childList: true,
                      subtree: true,
                    });
                  } catch (e) {}

                  var stopHydrationCleanup = function () {
                    if (hydrationCleanupObserver) {
                      hydrationCleanupObserver.disconnect();
                      hydrationCleanupObserver = null;
                    }
                  };

                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', stripInjectedHydrationAttrs, { once: true });
                  } else {
                    stripInjectedHydrationAttrs();
                  }

                  window.addEventListener('load', function () {
                    stripInjectedHydrationAttrs();
                    window.setTimeout(stopHydrationCleanup, 1500);
                  }, { once: true });

                  window.setTimeout(stopHydrationCleanup, 5000);

                  const originalFetch = window.fetch;
                  try {
                    window.fetch = originalFetch;
                  } catch (e) {
                    Object.defineProperty(window, 'fetch', {
                      value: originalFetch,
                      writable: true,
                      configurable: true
                    });
                  }
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-black text-white antialiased`} suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
