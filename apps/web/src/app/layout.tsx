import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LabelLens",
  description: "PWA mobile-first para escanear productos y calcular menús por gramos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
