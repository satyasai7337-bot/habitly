// Web app manifest (Next metadata route -> /manifest.webmanifest), making
// Habitly installable as a PWA on phone/desktop.
export default function manifest() {
  return {
    name: "Habitly — habits, meds & health",
    short_name: "Habitly",
    description: "Track habits, medications, weight and calories with reminders and AI coaching.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f3ea",
    theme_color: "#3f8f5c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
