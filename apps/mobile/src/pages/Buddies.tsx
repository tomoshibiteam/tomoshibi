import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { FriendFeed } from "@/components/FriendFeed";
import { UserPlus, UserCheck, UserX, Search, Trophy } from "lucide-react";

interface Friendship {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  requester_name?: string;
  receiver_name?: string;
}

interface UserProfile {
  id: string;
  name: string;
  rank: string;
  total_ap: number;
}

interface LeaderboardProfile {
  id: string;
  name: string;
  total_ap: number;
  current_streak: number;
}

const Buddies = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardProfile[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchPendingRequests();
      fetchLeaderboard();
    }
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;

    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (error) {
      console.error('Error fetching friends:', error);
      return;
    }

    const userIds = friendships?.flatMap(f => [f.requester_id, f.receiver_id]) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

    const enrichedFriends = friendships?.map(f => ({
      ...f,
      requester_name: profileMap.get(f.requester_id),
      receiver_name: profileMap.get(f.receiver_id),
    })) || [];

    setFriends(enrichedFriends);
  };

  const fetchPendingRequests = async () => {
    if (!user) return;

    const { data: requests, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching pending requests:', error);
      return;
    }

    const requesterIds = requests?.map(r => r.requester_id) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', requesterIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

    const enrichedRequests = requests?.map(r => ({
      ...r,
      requester_name: profileMap.get(r.requester_id),
    })) || [];

    setPendingRequests(enrichedRequests);
  };

  const fetchLeaderboard = async () => {
    if (!user) return;

    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, receiver_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    const friendIds = new Set<string>();
    friendships?.forEach(f => {
      friendIds.add(f.requester_id);
      friendIds.add(f.receiver_id);
    });
    friendIds.add(user.id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, total_ap, current_streak')
      .in('id', Array.from(friendIds))
      .order('total_ap', { ascending: false });

    setLeaderboard(profiles || []);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "検索条件を入力してください",
        variant: "destructive",
      });
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, rank, total_ap')
        .ilike('name', `%${searchQuery}%`)
        .neq('id', user?.id || '')
        .limit(10);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "エラー",
        description: "検索に失敗しました",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (targetUserId: string) => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(requester_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},receiver_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        toast({
          title: "すでに仲間申請済みです",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          receiver_id: targetUserId,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "仲間申請を送信しました",
        description: "相手が承認するまでお待ちください",
      });

      handleSearch();
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "エラー",
        description: "申請の送信に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;

      toast({
        title: "仲間申請を承認しました",
      });

      fetchFriends();
      fetchPendingRequests();
      fetchLeaderboard();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast({
        title: "エラー",
        description: "承認に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      toast({
        title: "申請を拒否しました",
      });

      fetchPendingRequests();
    } catch (error) {
      console.error('Error declining request:', error);
      toast({
        title: "エラー",
        description: "拒否に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      toast({
        title: "仲間を解除しました",
      });

      fetchFriends();
      fetchLeaderboard();
    } catch (error) {
      console.error('Error removing friend:', error);
      toast({
        title: "エラー",
        description: "解除に失敗しました",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">仲間</h1>
          <p className="text-sm text-muted-foreground">
            冒険を共にする仲間と繋がりましょう
          </p>
        </div>

        <Tabs defaultValue="feed" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="feed">活動フィード</TabsTrigger>
            <TabsTrigger value="friends">仲間一覧</TabsTrigger>
            <TabsTrigger value="search">
              仲間を探す
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Activity Feed */}
          <TabsContent value="feed" className="space-y-3">
            {user && <FriendFeed userId={user.id} />}
          </TabsContent>

          {/* Tab 2: Friends List & Leaderboard */}
          <TabsContent value="friends" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent" />
                仲間との捜査状況（累計AP）
              </h3>
              {leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    まだ仲間がいません
                  </p>
                  <Button onClick={() => navigate("/buddies?tab=search")}>
                    仲間を探す
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.slice(0, 10).map((profile, index) => (
                    <div
                      key={profile.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors ${
                        profile.id === user?.id
                          ? 'bg-primary/10 border border-primary'
                          : 'bg-muted/30'
                      }`}
                      onClick={() => navigate(`/profile?userId=${profile.id}`)}
                    >
                      <div className="font-bold text-lg w-8 text-center">
                        {index + 1}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                        🔍
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">
                          {profile.name} 調査員
                          {profile.id === user?.id && (
                            <Badge variant="secondary" className="ml-2">あなた</Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          🔥 {profile.current_streak || 0} 日連続
                        </p>
                      </div>
                      <Badge variant="outline" className="text-sm">
                        {profile.total_ap} AP
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="space-y-3">
              <h3 className="font-bold">仲間一覧</h3>
              {friends.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    まだ仲間がいません
                  </p>
                </Card>
              ) : (
                friends.map((friend) => {
                  const friendName = friend.requester_id === user?.id 
                    ? friend.receiver_name 
                    : friend.requester_name;
                  const friendId = friend.requester_id === user?.id
                    ? friend.receiver_id
                    : friend.requester_id;

                  return (
                    <Card 
                      key={friend.id} 
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/profile?userId=${friendId}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserCheck className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold">{friendName} 調査員</p>
                            <p className="text-xs text-muted-foreground">仲間</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFriend(friend.id);
                          }}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          解除
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Tab 3: Search & Pending Requests */}
          <TabsContent value="search" className="space-y-4">
            {pendingRequests.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold">承認待ちの申請</h3>
                {pendingRequests.map((request) => (
                  <Card key={request.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                          <UserPlus className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <p className="font-bold">{request.requester_name} 調査員</p>
                          <p className="text-xs text-muted-foreground">仲間申請</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptRequest(request.id)}
                        >
                          承認
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeclineRequest(request.id)}
                        >
                          拒否
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-bold">仲間をIDまたは名前で探す</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="プレイヤー名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching}>
                  <Search className="w-4 h-4 mr-1" />
                  検索
                </Button>
              </div>

              <div className="space-y-3">
                {searchResults.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">
                      検索結果がここに表示されます
                    </p>
                  </Card>
                ) : (
                  searchResults.map((profile) => (
                    <Card key={profile.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                            🔍
                          </div>
                          <div>
                            <p className="font-bold">{profile.name} 調査員</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">{profile.rank}</Badge>
                              <span>{profile.total_ap} AP</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSendRequest(profile.id)}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          申請する
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Buddies;
