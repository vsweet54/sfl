export const metadata = {
  title: "SFL Bypasser Tester",
  description: "Bypasser Link Tester",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
