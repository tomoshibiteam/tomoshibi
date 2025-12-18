import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Clock, CheckCircle, TrendingUp, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import UserRoleManager from "@/components/UserRoleManager";

interface Application {
  id: string;
  case_id: string;
  user_id: string;
  status: string;
  applied_at: string;
  notes: string | null;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  event_title?: string;
}

interface UserProgress {
  id: string;
  user_id: string;
  event_id: string;
  current_step: number;
  status: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  event_title?: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [activeTab, setActiveTab] = useState<'applications' | 'progress' | 'permissions'>('applications');

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (error || !data) {
        console.error('Not authorized as admin');
        navigate('/');
        return;
      }

      setIsAdmin(true);
      setCheckingRole(false);
    };

    checkAdminRole();
  }, [user, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchApplications();
      fetchUserProgress();
      
      // Set up realtime subscriptions
      const applicationsChannel = supabase
        .channel('case_applications_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'case_applications'
          },
          () => {
            fetchApplications();
          }
        )
        .subscribe();

      const progressChannel = supabase
        .channel('user_progress_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_progress'
          },
          () => {
            fetchUserProgress();
          }
        )
        .subscribe();

      // Set up realtime subscription for role changes
      const rolesChannel = supabase
        .channel('user-roles-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_roles'
          },
          () => {
            fetchAuditLogs();
          }
        )
        .subscribe();

      fetchAuditLogs();

      return () => {
        supabase.removeChannel(applicationsChannel);
        supabase.removeChannel(progressChannel);
        supabase.removeChannel(rolesChannel);
      };
    }
  }, [isAdmin]);

  const fetchApplications = async () => {
    const { data: applicationsData, error: applicationsError } = await supabase
      .from('case_applications')
      .select('*')
      .order('applied_at', { ascending: false });

    if (applicationsError) {
      console.error('Error fetching applications:', applicationsError);
      return;
    }

    if (!applicationsData || applicationsData.length === 0) {
      setApplications([]);
      return;
    }

    // Fetch related profiles
    const userIds = [...new Set(applicationsData.map(app => app.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, name, email, phone')
      .in('id', userIds);

    // Fetch related events
    const caseIds = [...new Set(applicationsData.map(app => app.case_id))];
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, title')
      .in('id', caseIds);

    // Map the data
    const applicationsWithUserInfo = applicationsData.map((app: any) => {
      const profile = profilesData?.find(p => p.id === app.user_id);
      const event = eventsData?.find(e => e.id === app.case_id);
      
      return {
        ...app,
        user_name: profile?.name,
        user_email: profile?.email,
        user_phone: profile?.phone,
        event_title: event?.title || '不明なイベント',
      };
    });

    setApplications(applicationsWithUserInfo);
  };

  const fetchUserProgress = async () => {
    const { data, error } = await supabase
      .from('user_progress')
      .select(`
        *,
        profiles:user_id (
          name
        ),
        events:event_id (
          title
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching user progress:', error);
    } else if (data) {
      const progressWithUserInfo = data.map((prog: any) => ({
        ...prog,
        user_name: prog.profiles?.name,
        event_title: prog.events?.title || '不明なイベント',
      }));
      setUserProgress(progressWithUserInfo);
    }
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from('role_audit_log')
      .select(`
        *,
        admin:profiles!role_audit_log_admin_user_id_fkey(name),
        target:profiles!role_audit_log_target_user_id_fkey(name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return;
    }

    setAuditLogs(data || []);
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-700">審査中</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-700">承認済み</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-700">却下</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProgressStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-100 text-blue-700">進行中</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-700">完了</Badge>;
      case 'abandoned':
        return <Badge variant="outline" className="bg-gray-100 text-gray-700">中断</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalCount = applications.length;
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const activeProgressCount = userProgress.filter(p => p.status === 'in_progress').length;
  const completedProgressCount = userProgress.filter(p => p.status === 'completed').length;

  if (loading || checkingRole) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">アクセス権限がありません</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            運営ダッシュボード
          </h1>
          <p className="text-muted-foreground">
            応募状況と進捗状況を管理
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'applications' | 'progress' | 'permissions')} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="applications">応募管理</TabsTrigger>
            <TabsTrigger value="progress">進捗管理</TabsTrigger>
            <TabsTrigger value="permissions">権限管理</TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    総応募数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-3xl font-bold">{totalCount}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    審査待ち
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="text-3xl font-bold">{pendingCount}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    承認済み
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-3xl font-bold">{approvedCount}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Applications List */}
            <Card>
              <CardHeader>
                <CardTitle>応募一覧</CardTitle>
                <CardDescription>
                  最新の応募から順に表示
                </CardDescription>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    まだ応募がありません
                  </p>
                ) : (
                  <div className="space-y-4">
                    {applications.map((application) => (
                      <div
                        key={application.id}
                        className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold">
                              {application.event_title || '不明なイベント'}
                            </h3>
                            {getStatusBadge(application.status)}
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm font-medium">
                              {application.user_name || 'N/A'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              📧 {application.user_email || 'メールアドレス未登録'}
                            </p>
                            {application.user_phone && (
                              <p className="text-sm text-muted-foreground">
                                📞 {application.user_phone}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            応募日時: {new Date(application.applied_at).toLocaleString('ja-JP')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Role Management */}
            <Card>
              <CardHeader>
                <CardTitle>ユーザー権限管理</CardTitle>
                <CardDescription>
                  ユーザーに管理者権限を付与
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserRoleManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            {/* Progress Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    総プレイヤー数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-3xl font-bold">{userProgress.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    プレイ中
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Play className="w-5 h-5 text-blue-600" />
                    <span className="text-3xl font-bold">{activeProgressCount}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    完了
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-3xl font-bold">{completedProgressCount}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress List */}
            <Card>
              <CardHeader>
                <CardTitle>進捗一覧</CardTitle>
                <CardDescription>
                  ユーザーのゲーム進捗状況
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userProgress.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    まだ進捗データがありません
                  </p>
                ) : (
                  <div className="space-y-4">
                    {userProgress.map((progress) => (
                      <div
                        key={progress.id}
                        className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold">
                              {progress.event_title}
                            </h3>
                            {getProgressStatusBadge(progress.status)}
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm font-medium">
                              プレイヤー: {progress.user_name || 'N/A'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              現在のステップ: {progress.current_step}
                            </p>
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                            <span>開始: {new Date(progress.created_at).toLocaleString('ja-JP')}</span>
                            <span>更新: {new Date(progress.updated_at).toLocaleString('ja-JP')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-6">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>権限管理</CardTitle>
                  <CardDescription>
                    管理者権限の付与と削除を行えます
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserRoleManager />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>監査ログ</CardTitle>
                  <CardDescription>
                    権限変更の履歴を表示します
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {auditLogs.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        監査ログはありません
                      </p>
                    ) : (
                      auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="text-sm">
                              <span className="font-medium">{log.admin?.name}</span>
                              {log.action === 'grant' ? ' が ' : ' が '}
                              <span className="font-medium">{log.target?.name}</span>
                              {log.action === 'grant' ? ' に管理者権限を付与' : ' の管理者権限を削除'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleString('ja-JP')}
                            </p>
                          </div>
                          <Badge variant={log.action === 'grant' ? 'default' : 'secondary'}>
                            {log.action === 'grant' ? '付与' : '削除'}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminDashboard;

