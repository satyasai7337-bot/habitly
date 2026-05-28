import "./globals.css";

export const metadata = {
  title: "Habitly — track habits, build a healthier you",
  description:
    "Track water, food, gym, sleep, walking, study and work. Cut down on alcohol, smoking, vaping and drugs. Reports, reminders and AI coaching.",
};

// Next 14 viewport export — mobile-friendly defaults + brand theme color.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover", // edge-to-edge on iPhone notch
  themeColor: "#8b5cf6",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
