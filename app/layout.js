export const metadata = {
  title: "Studio Agent — Prospection",
  description: "Agent IA de prospection pour studio de design graphique",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
