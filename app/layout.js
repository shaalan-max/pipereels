import "./globals.css";

export const metadata = {
  title: "Pipelooms Portal",
  description: "Pipelooms agency & client portal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
