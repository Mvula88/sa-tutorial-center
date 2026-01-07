import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/components/providers/auth-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SA Tutorial Centres | School Management System for Tutorial Centres",
  description: "Affordable school management software designed for South African tutorial centres. Manage students, fees, payments, and more. Start free today!",
  keywords: ["tutorial centre software", "school management system", "south africa", "student management", "fee management"],
  openGraph: {
    title: "SA Tutorial Centres | School Management System",
    description: "Affordable school management software designed for South African tutorial centres.",
    type: "website",
    locale: "en_ZA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
