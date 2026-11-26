import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Blend / Dashboard",
  description: "Loja de produtos",
  icons: { icon: [{ url: "/api/branding/icon?v=blend-5", type: "image/png" }] },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
