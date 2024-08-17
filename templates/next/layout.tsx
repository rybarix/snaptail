import { Inter } from "next/font/google";
import "./globals.css";
const inter = Inter({ subsets: ["latin"] });
import { metadata } from "./user/metadata";
export { metadata } from "./user/metadata";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={metadata?.lang ?? "en"}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
