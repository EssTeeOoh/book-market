import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tranquility Books",
  description: "A quieter marketplace for books worth keeping close.",
  icons: { icon: "/book-market.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
