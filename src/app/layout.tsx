import "./globals.css";

export const metadata = {
  title: "Patent Workflow Extractor MVP",
  description: "Deterministic workflow extraction from patents"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
