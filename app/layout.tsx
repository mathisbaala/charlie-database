// charlie-live/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Charlie · Intelligence Patrimoniale',
  description: 'Analyse patrimoniale des dirigeants de PME depuis Pappers, BODACC et Claude AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
