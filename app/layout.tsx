import type { Metadata } from 'next';
import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { AppProvider } from '@/lib/store';
import ClientShell from '@/components/ClientShell';

export const metadata: Metadata = {
  title: 'Kanam Story — Co-writer de ficción',
  description: 'Co-writer de ficción local-first en español, donde la conversación es el producto.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-bs-theme="dark">
      <head>
        {/* Apply the persisted theme before first paint to avoid a flash of the
            wrong theme on reload. The store mirrors the choice to localStorage
            (key `kanam-theme`); IndexedDB remains the source of truth. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('kanam-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-bs-theme',t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AppProvider>
          <ClientShell>{children}</ClientShell>
        </AppProvider>
      </body>
    </html>
  );
}