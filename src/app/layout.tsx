import "./globals.css";

export const metadata = {
  title: "Live Selling OMS",
  description: "Live Selling Order Management Software",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
