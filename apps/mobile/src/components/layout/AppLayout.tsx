import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import MobileFrame from "./MobileFrame";
import BottomNav from "../navigation/BottomNav";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { User, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AppLayout = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<{ profile_picture_url: string | null; name: string | null } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, profile_picture_url')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.warn("AppLayout: Profile fetch error (non-fatal):", error.message);
          return;
        }

        if (data) {
          setProfile(data);
        }
      } catch (e) {
        console.warn("AppLayout: Unexpected profile fetch error:", e);
      }
    };

    fetchProfile();
  }, [user]);

  const getProfileDisplay = () => {
    if (profile?.profile_picture_url) {
      // Attempt to get higher res for Google images
      const highResUrl = profile.profile_picture_url.replace("=s96-c", "=s400-c");
      return (
        <img
          src={highResUrl}
          alt="Profile"
          className="w-full h-full object-cover rounded-full"
        />
      );
    }

    // Get initial from metadata name, or email
    const displayName = user?.user_metadata?.name || user?.email?.split('@')[0];
    if (displayName) {
      const initial = displayName.charAt(0).toUpperCase();
      return <span className="text-sm font-bold">{initial}</span>;
    }

    return <User className="w-4 h-4" />;
  };

  return (
    <MobileFrame
      enableFontScale
      header={
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8D5BE] bg-[#f7f0e5]/95 backdrop-blur-sm shadow-[0_1px_5px_rgba(61,46,31,0.05)] relative z-50">
          <div
            className="flex items-center gap-2 cursor-pointer active:opacity-70 transition-opacity"
            onClick={() => navigate("/")}
          >
            <p className="text-[14px] font-bold font-serif tracking-[0.25em] text-[#3D2E1F] whitespace-nowrap">
              TOMOSHIBI
            </p>
          </div>
          <div className="flex items-center gap-2">
            {authLoading ? (
              <div className="w-8 h-8 rounded-full bg-[#E8D5BE]/30 animate-pulse" />
            ) : user ? (
              <button
                onClick={() => navigate("/profile")}
                className="w-9 h-9 rounded-full bg-[#FEF9F3] flex items-center justify-center text-[#7A6652] shadow-sm hover:shadow-md hover:scale-105 transition-all active:scale-95 border border-[#E8D5BE] overflow-hidden"
              >
                {getProfileDisplay()}
              </button>
            ) : (
              <button
                onClick={() => navigate("/auth")}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-[#D87A32] to-[#B85A1F] hover:from-[#E88B43] hover:to-[#C96B30] text-white text-[10px] font-serif font-bold tracking-widest transition-all shadow-md active:scale-95"
              >
                LOGIN
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
