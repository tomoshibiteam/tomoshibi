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
      header={
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#ede1d2]/80 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <img src={tomoshibiLogo} alt="TOMOSHIBI" className="w-7 h-7 rounded-lg shadow-sm" />
            <div className="leading-tight">
              <p className="text-[10px] text-[#b07a4c] font-semibold uppercase tracking-wider flex items-center gap-1">
                TOMOSHIBI
                <span className="px-1.5 py-0.5 rounded-full bg-[#f7efe5]/80 border border-[#eadfd0] text-[9px] text-[#7c644c] font-medium">β</span>
              </p>
              <p className="text-xs font-bold text-[#2f1d0f]">街歩き謎解きプラットフォーム</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-[#f7efe5] animate-pulse" />
            ) : user ? (
              <button
                onClick={() => navigate("/profile")}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ffb566] to-[#e67a28] flex items-center justify-center text-white shadow-md hover:shadow-lg hover:scale-105 transition-all active:scale-95"
              >
                <User className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => navigate("/auth")}
                className="px-3 py-1.5 rounded-full border border-stone-300 bg-white/80 backdrop-blur text-xs font-bold text-[#2f1d0f] hover:border-[#d4a574] hover:text-[#d4a574] transition-all shadow-sm active:scale-95"
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
