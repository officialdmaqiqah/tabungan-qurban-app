import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Leaf } from "lucide-react"; // Using Lucide icon for logo
import { Toaster } from "react-hot-toast";
import { createClient } from '@/lib/supabase/server';

import Header from "@/components/Header";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tabungan Qurban MAKT",
  description: "Aplikasi Tabungan Qurban Masjid Agung Kubah Timah Pangkalpinang",
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
    if (data) role = data.role;
  }
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {/* Navbar */}
        <Header user={user} role={role} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        
        <Toaster position="top-center" />

        {/* Footer */}
        <Footer />
      </body>
    </html>
  );
}
