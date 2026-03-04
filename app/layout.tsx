import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "แบบบันทึกกิจกรรมโฮมรูม | วิทยาลัยอาชีวศึกษาสุโขทัย",
  description: "ระบบบันทึกและรายงานกิจกรรมโฮมรูม วิทยาลัยอาชีวศึกษาสุโขทัย",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${geistSans.variable} antialiased bg-blue-50 min-h-screen py-8 px-4 font-sans`}>
        <div className="max-w-5xl mx-auto space-y-6">
          <Navbar />
          {/* Content Area */}
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
            {children}
          </div>
          <footer className="text-center text-sm text-gray-400 mt-8">
            © 2026 HomeRoom System - Sukhothai Vocational College
          </footer>
        </div>
      </body>
    </html>
  );
}
