import { Home, Map, BookOpen, User } from "lucide-react";
import { NavLink } from "react-router-dom";

const BottomNav = () => {
  const navItems = [
    { to: "/", label: "ホーム", icon: Home },
    { to: "/quests", label: "クエスト", icon: BookOpen },
    { to: "/map", label: "マップ", icon: Map },
    { to: "/profile", label: "マイページ", icon: User },
  ];

  return (
    <nav className="w-full bg-white/95 backdrop-blur-sm border-t border-[#ede1d2] px-2 py-2 safe-area-pb">
      <div className="grid grid-cols-4 gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 tap-effect ${isActive
                ? "bg-gradient-to-r from-[#ffb566] to-[#e67a28] text-white shadow-md scale-[1.02]"
                : "text-[#6b5a4a] hover:bg-[#f6eee3] active:scale-95"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`transition-transform duration-200 ${isActive ? "animate-bounce-subtle" : ""}`}>
                  <Icon className={`w-5 h-5 ${isActive ? "drop-shadow-sm" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`transition-all duration-200 ${isActive ? "font-bold" : ""}`}>
                  {label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white shadow-sm" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
