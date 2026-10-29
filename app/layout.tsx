import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Leaf } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { createClient } from '@/lib/supabase/server';

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RegisterServiceWorker from "@/components/pwa/RegisterServiceWorker";
import InstallAppBanner from "@/components/pwa/InstallAppBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#065f46",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Tabungan Qurban MAKT",
  description: "Aplikasi Tabungan Qurban Masjid Agung Kubah Timah Pangkalpinang",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Qurban MAKT",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let role = 'jamaah';
  if (user) {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (data?.role === 'super_admin' || user.user_metadata?.role === 'super_admin') {
      role = 'super_admin';
    } else if (data?.role === 'admin' || user.user_metadata?.role === 'admin') {
      role = 'admin';
    }
  }
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {/* PWA Service Worker Registration */}
        <RegisterServiceWorker />

        {/* Navbar */}
        <Header user={user} role={role} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        
        {/* Smart PWA Install Banner (Client-side, mobile only, excluded on admin) */}
        <InstallAppBanner />

        <Toaster 
          position="top-center" 
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '14px',
              padding: '12px 18px',
              maxWidth: '90vw',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              wordBreak: 'break-word',
            },
            success: {
              duration: 3500,
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />

        {/* Footer */}
        <Footer />
      </body>
    </html>
  );
}
