import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anja — Secretária Executiva com IA',
  description: 'Sua secretária executiva com IA para empreendedores brasileiros.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
