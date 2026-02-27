import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Receipt,
  ClipboardList,
  LogOut,
  Menu,
  X,
  FileText,
  Settings,
} from "lucide-react";
import { useState } from "react";

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Members", path: "/members", icon: Users },
    { name: "Contributions", path: "/contributions", icon: Wallet },
    { name: "Expenses", path: "/expenses", icon: Receipt },
    { name: "Reports", path: "/reports", icon: FileText },
    { name: "Audit Logs", path: "/logs", icon: ClipboardList },
  ];

  if (user?.role !== "Guest") {
    navItems.push({ name: "Settings", path: "/settings", icon: Settings });
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-white">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold">EIM Fund Manager</h1>
          <p className="text-xs text-slate-400 mt-1">Welcome, {user?.name}</p>
          <span className="text-xs bg-slate-800 px-2 py-1 rounded mt-2 inline-block">
            {user?.role}
          </span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                location.pathname === item.path
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-4 py-3 text-slate-300 hover:bg-red-900/20 hover:text-red-400 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header & Menu */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-20">
          <div>
            <h1 className="font-bold">EIM Fund Manager</h1>
            <p className="text-xs text-slate-400">{user?.name}</p>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-10 bg-slate-900/95 pt-20 px-4 md:hidden">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-4 rounded-lg text-base font-medium transition-colors",
                    location.pathname === item.path
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 px-4 py-4 text-red-400 hover:bg-red-900/20 rounded-lg mt-8"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>
          <footer className="mt-8 text-center text-xs text-gray-400 py-4 border-t border-gray-200">
            <p>&copy; {new Date().getFullYear()} EIM Fund Manager. All rights reserved.</p>
            <p className="mt-1 font-medium">Created by LUNDDREN REVILLAME (EIM Batch 79)</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
