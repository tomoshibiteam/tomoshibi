import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  ChevronRight,
  LogOut,
  Trash2,
  Globe,
  Info,
  Settings as SettingsIcon,
  Shield
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<{
    name: string;
    profile_picture_url: string | null;
    email: string | null;
  } | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      checkAdminRole();
    }
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, profile_picture_url, email')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('Settings: Error fetching profile:', error);
      } else if (data) {
        setProfile(data);
      }
    } catch (e) {
      console.warn('Settings: Unexpected profile error:', e);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "エラー",
        description: "ログアウトに失敗しました",
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  const handleDeleteAccount = async () => {
    // Note: Full account deletion requires backend implementation
    // For now, we'll just sign out and show a message
    toast({
      title: "お問い合わせください",
      description: "アカウント削除はサポートまでお問い合わせください",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEF9F3]">
        <div className="w-8 h-8 border-2 border-[#D87A32] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FEF9F3] pb-24 px-4 font-serif text-[#3D2E1F]">
      {/* Cinematic Vignette */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_transparent_10%,_#E8D5BE_120%)] z-0 pointer-events-none opacity-60" />

      <div className="relative z-10 pt-6 mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-widest mb-1">
          設定
        </h1>
        <p className="text-xs text-[#7A6652] tracking-wide">
          冒険の記録と設定
        </p>
      </div>

      {/* Profile Passport */}
      <div
        className="relative z-10 mb-8 p-5 rounded-3xl bg-white/80 border border-[#E8D5BE] shadow-[0_4px_20px_rgba(61,46,31,0.05)] cursor-pointer hover:bg-white transition-colors group"
        onClick={() => navigate("/profile/edit")}
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#E8D5BE] flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
            {profile?.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-[#FEF9F3]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg truncate text-[#3D2E1F]">
              {profile?.name || "名前未設定"}
            </p>
            <p className="text-xs text-[#7A6652] truncate font-sans tracking-wide mb-1">
              {profile?.email || user?.email || ""}
            </p>
            <div className="flex items-center gap-1 text-[#D87A32] text-[10px] font-bold tracking-widest">
              <span>プロフィール編集</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Menu Groups */}
      <div className="relative z-10 space-y-6">
        {/* App Settings */}
        <div>
          <h2 className="text-xs font-bold text-[#7A6652] ml-4 mb-2 tracking-widest">アプリ設定</h2>
          <div className="rounded-2xl bg-white/60 border border-[#E8D5BE] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#E8D5BE]/50">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-[#D87A32]" />
                <span className="text-sm font-bold">言語</span>
              </div>
              <span className="text-xs text-[#7A6652] font-sans">日本語</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-[#D87A32]" />
                <span className="text-sm font-bold">バージョン</span>
              </div>
              <span className="text-xs text-[#7A6652] font-sans">1.0.0</span>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div>
          <h2 className="text-xs font-bold text-[#7A6652] ml-4 mb-2 tracking-widest">アカウント</h2>
          <div className="rounded-2xl bg-white/60 border border-[#E8D5BE] overflow-hidden">
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className="w-full flex items-center gap-3 p-4 border-b border-[#E8D5BE]/50 hover:bg-[#FEF9F3] transition-colors text-left"
              >
                <Shield className="w-5 h-5 text-[#D87A32]" />
                <span className="text-sm font-bold text-[#3D2E1F]">管理者ダッシュボード</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-4 hover:bg-[#FEF9F3] transition-colors text-left group border-b border-[#E8D5BE]/50"
            >
              <LogOut className="w-5 h-5 text-[#7A6652] group-hover:text-[#3D2E1F]" />
              <span className="text-sm font-bold text-[#7A6652] group-hover:text-[#3D2E1F] transition-colors">ログアウト</span>
            </button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="w-full flex items-center gap-3 p-4 hover:bg-[#B85A1F]/5 transition-colors text-left group"
                >
                  <Trash2 className="w-5 h-5 text-[#B85A1F]/70 group-hover:text-[#B85A1F]" />
                  <span className="text-sm font-bold text-[#B85A1F]/70 group-hover:text-[#B85A1F] transition-colors">アカウント削除</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#FEF9F3] border-[#E8D5BE] font-serif">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-[#3D2E1F]">アカウントを削除しますか？</AlertDialogTitle>
                  <AlertDialogDescription className="text-[#7A6652]">
                    この操作は取り消せません。すべてのデータが永久に削除されます。
                    アカウント削除をご希望の場合は、サポートまでお問い合わせください。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-[#E8D5BE] text-[#7A6652] hover:bg-[#E8D5BE]/20 font-serif">キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-[#B85A1F] text-white hover:bg-[#A04E15] font-serif"
                  >
                    問い合わせる
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
