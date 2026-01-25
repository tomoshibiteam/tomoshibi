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
      return (
        <img
          src={profile.profile_picture_url}
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
            {authLoading ? (
              <div className="w-8 h-8 rounded-full bg-amber-100 animate-pulse" />
            ) : user ? (
              <button
                onClick={() => navigate("/profile")}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-md hover:shadow-lg hover:scale-105 transition-all active:scale-95 border border-amber-100 overflow-hidden"
              >
                {getProfileDisplay()}
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
