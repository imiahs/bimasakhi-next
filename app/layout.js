import Script from 'next/script';
import { ConfigProvider } from '@/context/ConfigContext';
import { UserProvider } from '@/context/UserContext';
import { LanguageProvider } from '@/context/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import FloatingActions from '@/components/ui/FloatingActions';
import LanguageToggle from '@/components/ui/LanguageToggle';
import AnalyticsTracker from '@/components/core/AnalyticsTracker';

import '@/styles/reset.css';
import '@/styles/variables.css';
import '@/styles/global.css';

export const metadata = {
  title: {
    default: 'Bima Sakhi',
    template: '%s | Bima Sakhi',
  },
  metadataBase: new URL('https://bimasakhi.com'),
  description: 'Women career & financial independence opportunity.',
  robots: 'index, follow',
  verification: { google: '4KX_wRx-TtBLEkejOgiejPMeNp7n4rGlRLfFwMxLJ2c' },
  icons: { icon: '/favicon-32.png' },
  openGraph: {
    siteName: 'Bima Sakhi',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager - TEMPORARILY DISABLED
        <Script id="gtm" strategy="afterInteractive">
          {\`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-KC9VM5VQ');\`}
        </Script>
        */}
      </head>
      <body>
        {/* GTM noscript fallback - TEMPORARILY DISABLED
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KC9VM5VQ"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        */}

        <ConfigProvider>
          <UserProvider>
            <LanguageProvider>
              {/* <AnalyticsTracker /> - TEMPORARILY DISABLED */}
              <div className="app-container">
                <Navbar />
                <main className="main-content">{children}</main>
                <Footer />
                <FloatingActions />
                <LanguageToggle />
              </div>
            </LanguageProvider>
          </UserProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
