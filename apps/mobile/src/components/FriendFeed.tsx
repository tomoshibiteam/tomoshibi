import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface PraiserInfo {
  user_id: string;
  user_name: string;
}

interface FeedItem {
  id: string;
  user_id: string;
  category: string;
  report_text: string;
  image_url: string | null;
  created_at: string;
  user_name: string;
  praise_count: number;
  user_praised: boolean;
  praisers: PraiserInfo[];
}

interface FriendFeedProps {
  userId: string;
}

const CATEGORY_ICONS: { [key: string]: string } = {
  "ゴミ拾い": "🗑️",
  "エコな選択": "♻️",
  "地域イベント参加": "🎪",
  "会話": "💬",
  "観察・調査": "🔍",
  "事件解決": "🎉",
};

const CATEGORY_AP: { [key: string]: number } = {
  "ゴミ拾い": 30,
  "エコな選択": 20,
  "地域イベント参加": 20,
  "会話": 20,
  "観察・調査": 20,
  "事件解決": 100,
};

export const FriendFeed = ({ userId }: FriendFeedProps) => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFriendFeed();

    // Set up realtime subscription for daily reports
    const reportsChannel = supabase
      .channel('friend-reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_reports'
        },
        () => {
          console.log('Daily report changed, refreshing feed...');
          fetchFriendFeed();
        }
      )
      .subscribe();

    // Set up realtime subscription for praises
    const praisesChannel = supabase
      .channel('friend-praises')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'praises'
        },
        () => {
          console.log('Praise changed, refreshing feed...');
          fetchFriendFeed();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(praisesChannel);
    };
  }, [userId]);

  const fetchFriendFeed = async () => {
    setLoading(true);
    try {
      // Get accepted friendships
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('requester_id, receiver_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

      if (friendshipsError) throw friendshipsError;

      // Build list of friend IDs including self
      const friendIds = new Set<string>([userId]);
      friendships?.forEach(f => {
        friendIds.add(f.requester_id === userId ? f.receiver_id : f.requester_id);
      });

      // Get daily reports from friends
      const { data: reports, error: reportsError } = await supabase
        .from('daily_reports')
        .select('*')
        .in('user_id', Array.from(friendIds))
        .order('created_at', { ascending: false })
        .limit(20);

      if (reportsError) throw reportsError;

      // Get user profiles
      const userIds = Array.from(new Set(reports?.map(r => r.user_id) || []));
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

      // Get praise counts for each report
      const reportIds = reports?.map(r => r.id) || [];
      const { data: praises, error: praisesError } = await supabase
        .from('praises')
        .select('log_id, praiser_user_id')
        .in('log_id', reportIds);

      if (praisesError) throw praisesError;

      // Get praiser user IDs
      const praiserIds = Array.from(new Set(praises?.map(p => p.praiser_user_id) || []));
      const { data: praiserProfiles, error: praiserProfilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', praiserIds);

      if (praiserProfilesError) throw praiserProfilesError;

      const praiserProfileMap = new Map(praiserProfiles?.map(p => [p.id, p.name]) || []);

      // Build praise count map and praisers list
      const praiseCountMap = new Map<string, number>();
      const userPraisedMap = new Map<string, boolean>();
      const praisersMap = new Map<string, PraiserInfo[]>();
      
      praises?.forEach(p => {
        praiseCountMap.set(p.log_id, (praiseCountMap.get(p.log_id) || 0) + 1);
        if (p.praiser_user_id === userId) {
          userPraisedMap.set(p.log_id, true);
        }
        
        // Add praiser info
        const praiserName = praiserProfileMap.get(p.praiser_user_id) || '調査員';
        const existingPraisers = praisersMap.get(p.log_id) || [];
        existingPraisers.push({
          user_id: p.praiser_user_id,
          user_name: praiserName
        });
        praisersMap.set(p.log_id, existingPraisers);
      });

      // Build feed items
      const items: FeedItem[] = (reports || []).map(r => ({
        id: r.id,
        user_id: r.user_id,
        category: r.category,
        report_text: r.report_text,
        image_url: r.image_url,
        created_at: r.created_at,
        user_name: profileMap.get(r.user_id) || '調査員',
        praise_count: praiseCountMap.get(r.id) || 0,
        user_praised: userPraisedMap.get(r.id) || false,
        praisers: praisersMap.get(r.id) || [],
      }));

      setFeedItems(items);
    } catch (error) {
      console.error('Error fetching friend feed:', error);
      toast({
        title: "エラー",
        description: "活動記録の取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePraise = async (logId: string, currentlyPraised: boolean) => {
    try {
      if (currentlyPraised) {
        // Remove praise
        const { error } = await supabase
          .from('praises')
          .delete()
          .eq('log_id', logId)
          .eq('praiser_user_id', userId);

        if (error) throw error;
      } else {
        // Add praise
        const { error } = await supabase
          .from('praises')
          .insert({
            log_id: logId,
            praiser_user_id: userId,
          });

        if (error) throw error;
      }

      // Refresh feed
      fetchFriendFeed();

      toast({
        title: currentlyPraised ? "賞賛を取り消しました" : "賞賛を送りました",
        description: currentlyPraised ? "" : "仲間に賞賛が届きました！",
      });
    } catch (error) {
      console.error('Error toggling praise:', error);
      toast({
        title: "エラー",
        description: "賞賛の送信に失敗しました",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          まだ活動記録がありません。<br />
          仲間を追加して、一緒に調査活動を始めましょう！
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feedItems.map((item) => (
        <Card key={item.id} className="p-3 sm:p-4">
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl sm:text-2xl">
              {CATEGORY_ICONS[item.category] || "📝"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="mb-2">
                <p className="text-xs sm:text-sm font-bold">
                  {item.user_name} 調査員が<span className="text-primary">{item.category}</span>を報告
                </p>
                <p className="text-xs text-muted-foreground">
                  +{CATEGORY_AP[item.category] || 20} AP · {format(new Date(item.created_at), 'M月d日 HH:mm', { locale: ja })}
                </p>
              </div>
              
              {item.report_text && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
                  {item.report_text}
                </p>
              )}
              
              {item.image_url && (
                <div className="mb-2 rounded-lg overflow-hidden">
                  <img 
                    src={item.image_url} 
                    alt="報告画像" 
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={item.user_praised ? "default" : "outline"}
                    onClick={() => handleTogglePraise(item.id, item.user_praised)}
                    className="text-xs"
                  >
                    {item.user_praised ? "⭐" : "👏"} 賞賛する
                  </Button>
                  {item.praise_count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {item.praise_count}人が賞賛
                    </span>
                  )}
                </div>
                {item.praisers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.praisers.map((praiser, idx) => (
                      <span 
                        key={`${praiser.user_id}-${idx}`}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-full text-xs"
                      >
                        ⭐ {praiser.user_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};