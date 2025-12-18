import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, FileText, ClipboardList, User, Users } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isGameplay = location.pathname.startsWith("/gameplay");

  const navItems = [
    { path: "/", icon: Home, label: "ホーム" },
    { path: "/cases", icon: FileText, label: "依頼(謎解き)" },
    { path: "/investigation", icon: ClipboardList, label: "調査報告" },
    { path: "/buddies", icon: Users, label: "仲間" },
    { path: "/profile", icon: User, label: "マイページ" },
  ];

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isGameplay ? "" : "pb-20"}`}>
      <main className="flex-1">{children}</main>

      {!isGameplay && (
        <>
          <footer className="py-4 sm:py-6 px-4 bg-muted/30 border-t border-border">
            <div className="max-w-screen-lg mx-auto text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">
                © {new Date().getFullYear()} TOMOSHIBI. All Rights Reserved.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                本サービスのすべてのコンテンツ、デザイン、およびロゴは、TOMOSHIBIチームに帰属します。
              </p>
            </div>
          </footer>

          <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elevated z-50">
            <div className="max-w-screen-lg mx-auto grid grid-cols-5 gap-1 px-2 py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all ${isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </>
      )}
    </div>
  );
};

export default Layout;
