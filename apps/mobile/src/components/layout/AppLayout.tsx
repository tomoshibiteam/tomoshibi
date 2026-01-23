import { Outlet } from "react-router-dom";
import MobileFrame from "./MobileFrame";
import BottomNav from "../navigation/BottomNav";
import tomoshibiLogo from "@/assets/tomoshibi-logo.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { User } from "lucide-react";

const AppLayout = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  return (
    <MobileFrame
      enableFontScale
      header={
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200 bg-amber-50/95 backdrop-blur-sm shadow-sm">
          <div
            className="flex items-center gap-2 cursor-pointer active:opacity-70 transition-opacity"
            onClick={() => navigate("/")}
          >
            <p className="text-[14px] font-bold tracking-[0.2em] text-amber-900">
              TOMOSHIBI
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-amber-100 animate-pulse" />
            ) : user ? (
              <button
                onClick={() => navigate("/profile")}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-md hover:shadow-lg hover:scale-105 transition-all active:scale-95"
              >
                <User className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => navigate("/auth")}
                className="px-4 py-2 rounded-full bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-all shadow-md active:scale-95"
              >
                ログイン
              </button>
            )}
          </div>
        </div>
      }
      content={<Outlet />}
      bottomNav={<BottomNav />}
    />
  );
};

export default AppLayout;
