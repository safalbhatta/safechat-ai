import { Outlet } from "react-router-dom";
import Sidebar from "../components/messaging/Sidebar.jsx";
import MobileNav from "../components/mobile/MobileNav.jsx";

export default function Layout() {
  return (
    <div className="h-screen overflow-hidden p-4 md:p-5">
      <div className="h-full flex gap-4">
        <div className="hidden md:flex shrink-0">
          <Sidebar />
        </div>

        <main className="apple-shell flex-1 min-w-0 overflow-hidden rounded-[34px]">
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
