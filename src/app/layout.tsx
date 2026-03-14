import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "foodscan – echt eten, echte keuzes",
  description: "Scan barcode of ingrediënten, krijg een eerlijk oordeel met NOVA en gezondere alternatieven.",
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('foodscan_theme');
    if (t === 'light') { document.documentElement.classList.remove('dark'); }
    else if (t === 'dark') { document.documentElement.classList.add('dark'); }
    else {
      document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
