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
    <nav className="w-full bg-white border-t border-[#ede1d2] px-2 py-3">
      <div className="grid grid-cols-4 gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold transition-colors ${isActive
                ? "bg-gradient-to-r from-[#ffb566] to-[#e67a28] text-white shadow-sm"
                : "text-[#6b5a4a] hover:bg-[#f6eee3]"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
