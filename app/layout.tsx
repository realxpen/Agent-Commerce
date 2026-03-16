import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'AgentCommerce | Autonomous AI Business Agents',
  description: 'AI-powered Web3 platform for autonomous AI business agents.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased text-white bg-black`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
