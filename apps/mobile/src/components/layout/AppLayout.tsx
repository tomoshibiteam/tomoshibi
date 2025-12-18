import { Outlet } from "react-router-dom";
import MobileFrame from "./MobileFrame";
import BottomNav from "../navigation/BottomNav";
import sprLogo from "@/assets/spr-logo.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { User } from "lucide-react";

const AppLayout = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  return (
    <MobileFrame
      header={
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#ede1d2] bg-white">
          <div className="flex items-center gap-2">
            <img src={sprLogo} alt="SPR" className="w-8 h-8 rounded-lg border border-[#f2caa0]/70" />
            <div className="leading-tight">
              <p className="text-xs text-[#b07a4c] font-semibold uppercase tracking-wide">TOMOSHIBI MOBILE</p>
              <p className="text-sm font-bold text-[#2f1d0f]">街歩き謎解きプラットフォーム</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 rounded-full bg-[#f7efe5] border border-[#eadfd0] text-xs text-[#7c644c] font-semibold">β</span>
            {loading ? (
              <div className="w-9 h-9 rounded-full bg-[#f7efe5] animate-pulse" />
            ) : user ? (
              <button
                onClick={() => navigate("/profile")}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-[#ffb566] to-[#e67a28] flex items-center justify-center text-white shadow-md hover:shadow-lg transition-all"
              >
                <User className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => navigate("/auth")}
                className="px-4 py-2 rounded-full border border-stone-300 bg-white/80 backdrop-blur text-sm font-bold text-[#2f1d0f] hover:border-[#d4a574] hover:text-[#d4a574] transition-all shadow-sm"
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
