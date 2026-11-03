export const metadata = {
  title: "NEO Bypasser",
  description: "Multi Bypass Tool oleh NEO",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://cdn.tailwindcss.com" />
      </head>
      <body style={{ margin: 0, background: "#0b0d13" }}>{children}</body>
    </html>
  );
}
