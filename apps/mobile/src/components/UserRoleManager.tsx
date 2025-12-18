import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Shield, Trash2, Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface UserWithRole extends Profile {
  roles: UserRole[];
}

const UserRoleManager = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentUser();
    loadUsersWithRoles();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user?.id || null);
  };

  const loadUsersWithRoles = async () => {
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .order('name');

      if (profileError) throw profileError;

      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'admin');

      if (roleError) throw roleError;

      const usersWithRoleData = (profiles || []).map((profile) => ({
        ...profile,
        roles: (roles || []).filter((role) => role.user_id === profile.id),
      }));

      setUsersWithRoles(usersWithRoleData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "エラー",
        description: "ユーザー情報の取得に失敗しました",
        variant: "destructive",
      });
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      setUsers(data || []);
      
      if (data && data.length === 0) {
        toast({
          title: "情報",
          description: "ユーザーが見つかりませんでした",
        });
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "エラー",
        description: "ユーザーの検索に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const grantAdminRole = async () => {
    if (!selectedUserId) {
      toast({
        title: "エラー",
        description: "ユーザーを選択してください",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUserId,
          role: 'admin'
        });

      if (roleError) {
        if (roleError.code === '23505') {
          toast({
            title: "情報",
            description: "このユーザーは既に管理者です",
          });
        } else {
          throw roleError;
        }
      } else {
        // Log the action
        await supabase
          .from('role_audit_log')
          .insert({
            admin_user_id: currentUser,
            target_user_id: selectedUserId,
            action: 'grant',
            role: 'admin'
          });

        toast({
          title: "成功",
          description: "管理者権限を付与しました",
        });
        
        setSelectedUserId("");
        setSearchTerm("");
        setUsers([]);
        loadUsersWithRoles();
      }
    } catch (error) {
      console.error('Error granting admin role:', error);
      toast({
        title: "エラー",
        description: "権限の付与に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const revokeAdminRole = async (userId: string, roleId: string) => {
    if (userId === currentUser) {
      toast({
        title: "エラー",
        description: "自分自身の権限は削除できません",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      // Log the action
      await supabase
        .from('role_audit_log')
        .insert({
          admin_user_id: currentUser,
          target_user_id: userId,
          action: 'revoke',
          role: 'admin'
        });

      toast({
        title: "成功",
        description: "管理者権限を削除しました",
      });

      loadUsersWithRoles();
    } catch (error) {
      console.error('Error revoking admin role:', error);
      toast({
        title: "エラー",
        description: "権限の削除に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Grant Section */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">ユーザー検索</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                type="text"
                placeholder="名前またはメールアドレスで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                disabled={loading}
              />
              <Button
                onClick={searchUsers}
                disabled={loading}
                variant="outline"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {users.length > 0 && (
            <div className="space-y-2">
              <Label>ユーザーを選択</Label>
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
          )}

          <Button
            onClick={grantAdminRole}
            disabled={loading || !selectedUserId}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 mr-2" />
            )}
            管理者権限を付与
          </Button>
        </CardContent>
      </Card>

      {/* Current Admins List */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label className="text-base">現在の管理者</Label>
            {usersWithRoles
              .filter((user) => user.roles.length > 0)
              .map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.name}</p>
                      {user.id === currentUser && (
                        <Badge variant="secondary">あなた</Badge>
                      )}
                    </div>
                    {user.email && (
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>管理者</Badge>
                    {user.id !== currentUser && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => revokeAdminRole(user.id, user.roles[0].id)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserRoleManager;
