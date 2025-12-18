import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Profile {
  id: string;
  name: string;
  email: string | null;
}

const Setup = () => {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [hasAdmin, setHasAdmin] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, []);

  const checkAdminAndLoadUsers = async () => {
    try {
      // Check if any admin exists
      const { data: adminRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);

      if (roleError) throw roleError;

      if (adminRoles && adminRoles.length > 0) {
        setHasAdmin(true);
        toast({
          title: "セットアップ完了済み",
          description: "管理者は既に設定されています",
        });
        navigate('/');
        return;
      }

      // Load all users
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .order('created_at', { ascending: true });

      if (profileError) throw profileError;

      setUsers(profiles || []);
    } catch (error) {
      console.error('Error checking admin:', error);
      toast({
        title: "エラー",
        description: "初期化に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createFirstAdmin = async () => {
    if (!selectedUserId) {
      toast({
        title: "エラー",
        description: "ユーザーを選択してください",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUserId,
          role: 'admin'
        });

      if (error) throw error;

      toast({
        title: "成功",
        description: "最初の管理者を作成しました",
      });

      navigate('/admin');
    } catch (error) {
      console.error('Error creating admin:', error);
      toast({
        title: "エラー",
        description: "管理者の作成に失敗しました",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hasAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl">初回セットアップ</CardTitle>
          </div>
          <CardDescription>
            最初の管理者を設定してください。この操作は一度だけ実行できます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">ユーザーを選択</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="ユーザーを選択..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} {user.email ? `(${user.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={createFirstAdmin}
            disabled={creating || !selectedUserId}
            className="w-full"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                作成中...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                管理者として設定
              </>
            )}
          </Button>

          {users.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              登録ユーザーがいません。先にアカウントを作成してください。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Setup;
