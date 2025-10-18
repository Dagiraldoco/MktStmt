import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Market Sentiment Composite',
  description:
    'Aggregated stock-market sentiment from multiple sources with transparent methodology.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
