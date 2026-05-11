import "./globals.css";

export const metadata = {
  title: "FOMO",
  description: "Get your tickets before they're gone",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body>{children}</body>
    </html>
  );
}
