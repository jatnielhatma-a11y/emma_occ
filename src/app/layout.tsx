import type { Metadata, Viewport } from 'next';
import './globals.css';
import './live.css';

export const metadata: Metadata = {
  title: 'Emma OCC v4.1',
  description: 'Personal Operations Control Center',
  applicationName: 'Emma OCC',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Emma OCC', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#08101f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
