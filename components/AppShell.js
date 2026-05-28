import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import BottomNav from "@/components/BottomNav";

// App layout: fixed left sidebar (md+) + sticky top bar + main content.
// On mobile, a bottom nav replaces the sidebar; main gets extra bottom
// padding so content isn't hidden under it.
export default function AppShell({ name, avatar, children }) {
  return (
    <div className="min-h-screen">
      <Sidebar name={name} avatar={avatar} />
      <div className="md:pl-64">
        <Topbar name={name} avatar={avatar} />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 sm:px-6 md:pb-16">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
