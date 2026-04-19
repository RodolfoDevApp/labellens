import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppNavbar } from "@/shared/ui/AppNavbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "LabelLens",
  description: "PWA mobile-first para escanear productos y calcular menús por gramos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="ll-app-bg text-[#18261e]">
        <AppNavbar />
        {children}
      </body>
    </html>
  );
}
