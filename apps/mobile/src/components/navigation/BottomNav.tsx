import { useLocation, useNavigate } from "react-router-dom";
import { Flame, Map, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
    path: string;
    icon: React.ElementType;
    label: string;
}

const navItems: NavItem[] = [
    { path: "/", icon: Flame, label: "Home" },
    { path: "/quests", icon: Map, label: "Explore" },
    { path: "/profile", icon: User, label: "Profile" },
];

const BottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <nav className="flex items-center justify-around h-16 bg-amber-50/95 backdrop-blur-sm border-t border-amber-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-200 active:scale-95",
                            isActive
                                ? "text-amber-700"
                                : "text-amber-600/60 hover:text-amber-600"
                        )}
                    >
                        <Icon
                            className={cn(
                                "w-5 h-5 transition-transform duration-200",
                                isActive && "scale-110"
                            )}
                            strokeWidth={isActive ? 2.5 : 2}
                        />
                        <span
                            className={cn(
                                "text-[10px] font-medium",
                                isActive && "font-bold"
                            )}
                        >
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
};

export default BottomNav;
