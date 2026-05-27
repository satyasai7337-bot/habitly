import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

// App layout: fixed left sidebar (md+) + sticky top bar + main content.
export default function AppShell({ name, children }) {
  return (
    <div className="min-h-screen">
      <Sidebar name={name} />
      <div className="md:pl-64">
        <Topbar name={name} />
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
