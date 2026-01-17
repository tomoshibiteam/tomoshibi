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
    <nav className="w-full bg-white/80 backdrop-blur-xl border-t border-white/50 px-4 py-1.5 safe-area-pb">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 py-2 px-4 min-h-[52px] rounded-xl text-[11px] font-medium transition-all duration-300 ${isActive
                ? "text-[#F2994A]"
                : "text-[#666666] hover:text-[#333333] active:scale-95"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`w-5 h-5 transition-all duration-300 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"
                    }`}
                />
                <span className="mt-0.5">{label}</span>
                {isActive && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#F2994A]" />
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

