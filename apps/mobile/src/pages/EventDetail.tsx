import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { MapPin, ArrowLeft, Calendar, DollarSign, Smartphone, Dumbbell, Lightbulb, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

type Event = {
  id: string;
  quest_id?: string;
  title: string;
  key_visual_url: string | null;
  synopsis: string;
  location: string;
  difficulty: number;
  status: string;
  start_code: string;
  event_date: string | null;
  event_time: string | null;
  reception_location: string | null;
  participation_fee: number | null;
  purchased?: boolean;
  progressStatus?: 'in_progress' | 'completed' | 'not_started';
};

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProgress, setHasProgress] = useState(false);
  const [progressStatus, setProgressStatus] = useState<Event['progressStatus']>();
  const [purchased, setPurchased] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationCount, setApplicationCount] = useState(0);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [startCode, setStartCode] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEvent();
    }
  }, [id]);

  useEffect(() => {
    if (user && id) {
      checkApplication();
    }
    if (id) {
      fetchApplicationCount();
    }
  }, [user, id]);

  // リアルタイムで応募人数を更新
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel('case-applications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'case_applications',
          filter: `case_id=eq.${id}`
        },
        () => {
          fetchApplicationCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Check if event is active
      if (data.status !== '受付中') {
        toast({
          title: "アクセスできません",
          description: "このイベントは現在公開されていません",
          variant: "destructive",
        });
        navigate('/');
        return;
      }
      
      setEvent(data);
      if (user) {
        await checkProgress(data);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      toast({
        title: "エラー",
        description: "イベント情報の取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkProgress = async (targetEvent?: Event) => {
    const eventForCheck = targetEvent || event;
    if (!user || !id || !eventForCheck) {
      setHasProgress(false);
      setProgressStatus(undefined);
      setPurchased(false);
      return;
    }

    const [{ data: progressData }, { data: purchaseData }] = await Promise.all([
      supabase
        .from('user_progress')
        .select('id, current_step, status')
        .eq('user_id', user.id)
        .eq('event_id', eventForCheck.id)
        .maybeSingle(),
      supabase
        .from('purchases')
        .select('id')
        .eq('user_id', user.id)
        .or(`event_id.eq.${eventForCheck.id}${eventForCheck.quest_id ? `,quest_id.eq.${eventForCheck.quest_id}` : ''}`),
    ]);

    setHasProgress(!!progressData);
    setProgressStatus((progressData?.status as Event['progressStatus']) || "not_started");
    setPurchased((purchaseData || []).length > 0);
  };

  useEffect(() => {
    if (user && event?.id) {
      checkProgress(event);
    }
    if (!user) {
      setPurchased(false);
      setHasProgress(false);
      setProgressStatus(undefined);
    }
  }, [user, event?.id]);

  const checkApplication = async () => {
    if (!user || !id) return;

    const { data } = await supabase
      .from('case_applications')
      .select('id')
      .eq('user_id', user.id)
      .eq('case_id', id)
      .maybeSingle();

    setHasApplied(!!data);
  };

  const fetchApplicationCount = async () => {
    if (!id) return;

    const { count } = await supabase
      .from('case_applications')
      .select('*', { count: 'exact', head: true })
      .eq('case_id', id);

    setApplicationCount(count || 0);
  };

  const handleApply = async () => {
    if (!user) {
      navigate("/auth", { state: { returnTo: `/cases/${id}` } });
      return;
    }

    if (hasApplied) {
      toast({
        title: "応募済みです",
        description: "すでにこの依頼に応募しています",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('case_applications')
        .insert({
          user_id: user.id,
          case_id: id,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "応募完了",
        description: "依頼への応募が完了しました",
      });

      setHasApplied(true);
      fetchApplicationCount();
    } catch (error) {
      console.error('Error applying:', error);
      toast({
        title: "エラー",
        description: "応募に失敗しました",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-background p-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full mb-6" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p>イベントが見つかりません</p>
        </div>
      </Layout>
    );
  }

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return "初級";
    if (difficulty === 3) return "中級";
    return "上級";
  };

  const handleStartGame = async () => {
    console.log('🎮 handleStartGame called', { 
      user: user?.id, 
      hasProgress, 
      eventId: id,
      currentUrl: window.location.href 
    });
    
    if (!user) {
      console.log('❌ No user, navigating to auth');
      navigate("/auth", { state: { returnTo: `/cases/${id}` } });
      return;
    }

    if (!purchased && !hasProgress) {
      toast({
        title: "購入が必要です",
        description: "Web版のクエスト詳細から購入してください",
        variant: "destructive",
      });
      return;
    }

    if (hasProgress && progressStatus === 'completed') {
      // reset to start over
      await supabase
        .from('user_progress')
        .update({ current_step: 1, status: 'in_progress' })
        .eq('user_id', user.id)
        .eq('event_id', id);
      navigate(`/gameplay/${id}`);
      return;
    }

    if (hasProgress && progressStatus === 'in_progress') {
      console.log('✅ Has progress, navigating to gameplay:', `/gameplay/${id}`);
      navigate(`/gameplay/${id}`);
      return;
    }

    console.log('📝 Showing code dialog');
    // Show code input dialog
    setShowCodeDialog(true);
  };

  const handleSubmitCode = async () => {
    console.log('🔑 handleSubmitCode called', { 
      startCode, 
      userId: user?.id, 
      eventId: event?.id,
      eventStartCode: event?.start_code 
    });
    
    if (!startCode.trim() || !user || !event) {
      console.log('❌ Missing required data');
      return;
    }

    setIsStarting(true);

    try {
      // Verify start code
      if (startCode.trim() !== event.start_code) {
        console.log('❌ Wrong code', { entered: startCode.trim(), expected: event.start_code });
        toast({
          title: "コードが違います",
          description: "正しい開始コードを入力してください",
          variant: "destructive",
        });
        setIsStarting(false);
        return;
      }

      console.log('✅ Code correct, creating progress');
      
      // Create user progress
      const { error } = await supabase
        .from('user_progress')
        .insert({
          user_id: user.id,
          event_id: event.id,
          current_step: 1,
          status: 'in_progress'
        });

      if (error) throw error;

      console.log('✅ Progress created, navigating to gameplay:', `/gameplay/${id}`);

      toast({
        title: "ゲーム開始！",
        description: "任務を開始します",
      });

      setShowCodeDialog(false);
      navigate(`/gameplay/${id}`);
    } catch (error) {
      console.error('❌ Error starting game:', error);
      toast({
        title: "エラー",
        description: "ゲームの開始に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
      checkProgress(event || undefined);
    }
  };

  const handleShare = async () => {
    const shareText = `${event.title} - 君も「SPR探偵事務所」で一緒に謎を解かないか？ #SPR探偵事務所`;
    const appUrl = "https://spr-topaz.vercel.app/";
    const fullText = `${shareText} ${appUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: fullText,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(fullText);
        toast({
          title: "リンクをコピーしました",
          description: "友達にシェアしよう",
        });
      } catch (error) {
        console.error('Clipboard copy failed:', error);
      }
    }
  };

  const progressLabel = () => {
    if (progressStatus === 'completed') return '解決済';
    if (progressStatus === 'in_progress') return '進行中';
    return '未開始';
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-6">
        {/* Header with Back Button */}
        <div className="gradient-primary text-primary-foreground px-6 pt-8 pb-6">
          <button
            onClick={() => navigate("/cases")}
            className="flex items-center gap-2 mb-4 text-sm opacity-90 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
          <h1 className="text-2xl font-bold">依頼詳細</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {purchased && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                購入済み
              </Badge>
            )}
            {progressStatus === 'in_progress' && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                続きから再開できます
              </Badge>
            )}
            {progressStatus === 'completed' && (
              <Badge className="bg-green-100 text-green-700 border-green-300">
                解決済み
              </Badge>
            )}
            {!hasProgress && (
              <Badge className="bg-gray-100 text-gray-600 border-gray-200">
                未開始
              </Badge>
            )}
          </div>
        </div>

        <div className="px-6 -mt-4 space-y-6 pb-8">
          {/* Key Visual */}
          {event.key_visual_url && (
            <Card className="shadow-card overflow-hidden max-w-2xl mx-auto">
              <img
                src={event.key_visual_url}
                alt={event.title}
                className="w-full h-auto object-contain"
              />
            </Card>
          )}

          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold mb-2">SPR探偵事務所の事件簿 その１</h1>
            <h2 className="text-2xl font-bold text-primary">「失われた虹色のメロディーの秘密」</h2>
          </div>

          {/* Event Info */}
          <Card className="shadow-card p-6">
            <h3 className="font-bold text-lg mb-4">開催情報</h3>
            {applicationCount > 0 && (
              <div className="mb-4 p-3 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium text-primary">
                  🎉 現在 {applicationCount} 名の探偵が応募中
                </p>
              </div>
            )}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">開催日時</p>
                  <p className="text-muted-foreground">
                    {event.event_date || '11/16 (土)'} {event.event_time || '9:00-16:00'}
                  </p>
                  <p className="text-sm text-muted-foreground">※最終受付 15:00</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">開催場所</p>
                  <p className="text-muted-foreground">{event.location}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.reception_location || '（受付：公園管理棟エリア）'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 break-all">
                    地図URL: https://maps.app.goo.gl/DLe77GQSbKiViXB69
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">参加費用</p>
                  <p className="text-muted-foreground">
                    {event.participation_fee ? `${event.participation_fee}円` : '500円'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Share2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium mb-2">リンクをコピーする</p>
                  <Button onClick={handleShare} variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    リンクをコピーする
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Synopsis */}
          <Card className="shadow-card p-6">
            <h3 className="font-bold text-lg mb-4">依頼内容</h3>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p className="whitespace-pre-wrap">{event.synopsis}</p>
            </div>
          </Card>

          {/* Experience System */}
          <Card className="shadow-card p-6">
            <h3 className="font-bold text-lg mb-4">探偵の心得：任務遂行の仕組み</h3>
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <Smartphone className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">探偵ツール（本アプリ）で任務を遂行</p>
                  <p className="text-sm text-muted-foreground">
                    このアプリが君の相棒だ。物語の進行、謎の答えの入力、そしてヒントの閲覧まで、すべてをサポートする。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Dumbbell className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">日常の捜査で、道具を育てる</p>
                  <p className="text-sm text-muted-foreground">
                    日々の捜査報告（ごみ拾いの写真報告など）で『AP』を貯めよう。貯めたポイントで、君の『調査道具』を強化できる。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Lightbulb className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">強化した道具で、ヒントを得よ</p>
                  <p className="text-sm text-muted-foreground">
                    任務中に行き詰まっても、強化した道具（ルーペなど）があれば、レベルに応じたヒントを解放できる。
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Participation Steps */}
          <Card className="shadow-card p-6">
            <h3 className="font-bold text-lg mb-4">任務への参加手順</h3>
            <ol className="space-y-3 list-decimal list-inside text-muted-foreground">
              <li>探偵登録と事件への参加を完了する</li>
              <li>当日、受付で「事件開始コード」を入手する（参加費と引き換え）</li>
              <li>アプリでコードを入力し、任務を開始する</li>
            </ol>
          </Card>

          {/* FAQ */}
          <Card className="shadow-card p-6">
            <h3 className="font-bold text-lg mb-4">よくある質問</h3>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>謎が解けない場合は？</AccordionTrigger>
                <AccordionContent>
                  アプリ内のヒント機能（AP消費）をご利用いただけます。
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>一人でも参加できますか？</AccordionTrigger>
                <AccordionContent>
                  もちろんです。多くの探偵が一人で事件を解決しています。
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          {/* Notice */}
          <Card className="shadow-card p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground text-center">
              ※ゲーム内容やイベント内容は変更される可能性があります
            </p>
          </Card>

          {/* Application and Start Game Buttons */}
          {event.status === "受付中" && (
            <div className="space-y-3">
              {!authLoading && !user ? (
                <>
                  <Button
                    onClick={() => navigate("/auth", { state: { returnTo: `/cases/${id}` } })}
                    className="w-full h-14 text-lg font-bold sticky bottom-4 shadow-lg"
                    size="lg"
                  >
                    探偵登録する
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    依頼に参加するには、探偵登録をお願いします
                  </p>
                </>
              ) : (
                <>
                  {!hasApplied && (
                    <Button
                      onClick={handleApply}
                      variant="outline"
                      className="w-full h-14 text-lg font-bold shadow-lg"
                      size="lg"
                      disabled={authLoading}
                    >
                      この依頼に応募する
                    </Button>
                  )}
                  {hasApplied && (
                    <div className="p-3 bg-primary/10 rounded-lg text-center mb-3">
                      <p className="text-sm font-medium text-primary">
                        ✓ 応募済み - 当日受付で開始コードを受け取ってください
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={() => {
                      console.log('🎬 Start/Resume button clicked');
                      handleStartGame();
                    }}
                    className="w-full h-14 text-lg font-bold sticky bottom-4 shadow-lg"
                    size="lg"
                    disabled={authLoading || (!purchased && !hasProgress)}
                    variant={progressStatus === 'completed' ? 'outline' : 'default'}
                  >
                    {!purchased
                      ? "Webから購入してください"
                      : progressStatus === 'completed'
                      ? "解決済み – 再プレイする"
                      : hasProgress
                      ? "続きから再開する"
                      : "任務を開始する"}
                  </Button>
                  {!purchased && (
                    <p className="text-sm text-muted-foreground text-center">
                      Web版のクエスト詳細で購入すると、このボタンから開始できます
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {event.status === "近日公開" && (
            <Button disabled className="w-full h-14 text-lg sticky bottom-4 shadow-lg" size="lg">
              近日公開
            </Button>
          )}

          {event.status === "終了" && (
            <Button disabled className="w-full h-14 text-lg sticky bottom-4 shadow-lg" size="lg">
              終了しました
            </Button>
          )}
        </div>

        {/* Start Code Dialog */}
        <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>任務開始コードを入力</DialogTitle>
              <DialogDescription>
                受付で受け取った開始コードを入力してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="開始コードを入力..."
                value={startCode}
                onChange={(e) => setStartCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitCode()}
              />
              <Button 
                onClick={handleSubmitCode} 
                className="w-full"
                disabled={isStarting || !startCode.trim()}
              >
                {isStarting ? "確認中..." : "任務を開始する"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
    );
  };

export default EventDetail;
