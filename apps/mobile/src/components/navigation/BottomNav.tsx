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
        <nav className="flex items-center justify-around h-16 bg-[#f7f0e5]/95 backdrop-blur-sm border-t border-[#E8D5BE] shadow-[0_-2px_10px_rgba(61,46,31,0.05)] relative z-50">
            {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-300 active:scale-95 group",
                            isActive
                                ? "text-[#D87A32]"
                                : "text-[#7A6652]/60 hover:text-[#7A6652]"
                        )}
                    >
                        <div className={cn(
                            "relative flex items-center justify-center transition-all duration-300",
                            isActive ? "-translate-y-1" : "group-hover:-translate-y-0.5"
                        )}>
                            {isActive && (
                                <div className="absolute inset-0 bg-[#D87A32] opacity-20 blur-lg rounded-full animate-pulse" />
                            )}
                            <Icon
                                className={cn(
                                    "w-5 h-5 transition-transform duration-300 relative z-10",
                                    isActive && "scale-110 drop-shadow-sm"
                                )}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                        </div>
                        <span
                            className={cn(
                                "text-[10px] font-medium font-serif tracking-wider transition-opacity duration-300",
                                isActive ? "opacity-100 font-bold" : "opacity-70 group-hover:opacity-100"
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
