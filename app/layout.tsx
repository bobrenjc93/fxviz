export const metadata = {
  title: "PyGraph Formatter",
  description: "Paste Python graph traces, format + highlight",
};

import "../styles/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

