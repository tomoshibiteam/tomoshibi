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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          設定
        </h1>
        <p className="text-muted-foreground">
          プロフィールとアプリの設定
        </p>
      </div>

      {/* Profile Section */}
      <Card
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => navigate("/profile/edit")}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
              {profile?.profile_picture_url ? (
                <img
                  src={profile.profile_picture_url}
                  alt="プロフィール画像"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg truncate">
                {profile?.name || "名前未設定"}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {profile?.email || user?.email || ""}
              </p>
              <p className="text-xs text-primary mt-1">
                プロフィールを編集
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* App Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <span>アプリ設定</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <span>言語</span>
            </div>
            <span className="text-muted-foreground">日本語</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-muted-foreground" />
              <span>バージョン</span>
            </div>
            <span className="text-muted-foreground">1.0.0</span>
          </div>
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5 text-primary" />
            <span>アカウント</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isAdmin && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-primary/50 hover:border-primary text-primary"
              onClick={() => navigate("/admin")}
            >
              <Shield className="w-5 h-5" />
              運営ダッシュボード
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            ログアウト
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 text-destructive hover:text-destructive border-destructive/50 hover:border-destructive"
              >
                <Trash2 className="w-5 h-5" />
                アカウントを削除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>アカウントを削除しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  この操作は取り消せません。すべてのデータが永久に削除されます。
                  アカウント削除をご希望の場合は、サポートまでお問い合わせください。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  問い合わせる
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
