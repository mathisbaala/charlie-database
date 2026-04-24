import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CHARLIE Client',
  description: 'Comprenez vos clients en 10 secondes avec les signaux essentiels Pappers et DataGouv.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
