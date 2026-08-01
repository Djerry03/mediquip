import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppFloat from './components/WhatsAppFloat';
import Toast from './components/Toast';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3004';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Mediquipe — Matériel médical à Yaoundé, livré ou à retirer',
    template: '%s | Mediquipe',
  },
  description:
    'Matériel médical et paramédical livré à Yaoundé en 2h à 24h, ou à retirer en boutique. Paiement à la livraison ou Mobile Money.',
  keywords: [
    'matériel médical Cameroun',
    'matériel médical Yaoundé',
    'tensiomètre Yaoundé',
    'fauteuil roulant Cameroun',
    'oxymètre',
    'livraison matériel médical',
  ],
  openGraph: {
    type: 'website',
    locale: 'fr_CM',
    siteName: 'Mediquipe',
    url: siteUrl,
    title: 'Mediquipe — Matériel médical à Yaoundé',
    description:
      'Matériel médical livré à Yaoundé en 2h à 24h, ou à retirer en boutique. Paiement à la livraison ou Mobile Money.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          <AppProvider>
            <Navbar />
            <main className="main-content">{children}</main>
            <Footer />
            <WhatsAppFloat />
            <Toast />
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
