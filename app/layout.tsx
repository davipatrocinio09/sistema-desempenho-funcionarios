import type { Metadata } from 'next';
import { DM_Sans, Manrope } from 'next/font/google';
import './globals.css';

const body = DM_Sans({ variable: '--font-body', subsets: ['latin'] });
const heading = Manrope({ variable: '--font-heading-custom', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Avança — Gestão de desempenho',
  description: 'Atividades, metas e desempenho da equipe em um só lugar.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${body.variable} ${heading.variable}`}>{children}</body></html>;
}
