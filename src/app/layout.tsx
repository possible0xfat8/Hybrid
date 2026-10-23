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
  return (
    <html lang="en" className="dark">
      <head>
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
