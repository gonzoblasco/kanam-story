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
      <body>
        <AppProvider>
          <ClientShell>{children}</ClientShell>
        </AppProvider>
      </body>
    </html>
  );
}