import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Coffee, Eye, Book, Clock, Trophy, Upload, Lightbulb, Compass } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toZonedTime } from "date-fns-tz";
import { format, subDays } from "date-fns";

interface CategoryInfo {
  value: string;
  label: string;
  icon: string;
  ap: number;
  description: string;
}

const CATEGORIES: CategoryInfo[] = [
  {
    value: "ゴミ拾い",
    label: "ゴミ拾い",
    icon: "🗑️",
    ap: 30,
    description: "街に残された「事件の痕跡（ごみ）」を発見・回収。現場保全は探偵の基本だ。君の行動が、未来を変える確かな証拠となる。"
  },
  {
    value: "エコな選択",
    label: "エコな選択",
    icon: "🌱",
    ap: 20,
    description: "未来への「賢明な選択」を報告。マイボトル、エコバッグ、公共交通機関の利用…そのスマートな選択が、事件の根本解決に繋がる。"
  },
  {
    value: "地域イベント参加",
    label: "地域イベント参加",
    icon: "🎎",
    ap: 20,
    description: "地域の「集会」に潜入せよ。お祭り、清掃活動、ワークショップ…現場には、君だけが気づける貴重な情報（手がかり）が眠っている。"
  },
  {
    value: "会話",
    label: "会話",
    icon: "💬",
    ap: 20,
    description: "「聞き込み調査」の記録。家族や友人と交わした、社会や環境に関する会話を報告せよ。思わぬ証言が隠れているかもしれない。"
  },
  {
    value: "観察・調査",
    label: "観察・調査",
    icon: "🔍",
    ap: 20,
    description: "街を歩いて気づいたこと、本やネットで調べたこと。君の知性と観察眼が、事件の輪郭を浮かび上がらせる。"
  }
];

interface DailyReport {
  id: string;
  category: string;
  report_text: string;
  image_url: string | null;
  created_at: string;
}

interface AchievementTemplate {
  id: string;
  name: string;
  description: string;
  ap_reward: number;
  category: string;
}

interface ToolConfig {
  name: string;
  icon: typeof Search;
  dbField: "magnifying_glass_level" | "lantern_level" | "compass_level";
  color: string;
}

const TOOLS: ToolConfig[] = [
  { name: "観察ルーペ", icon: Search, dbField: "magnifying_glass_level", color: "#FFD700" },
  { name: "調査ランタン", icon: Lightbulb, dbField: "lantern_level", color: "#FFA500" },
  { name: "方位コンパス", icon: Compass, dbField: "compass_level", color: "#4169E1" },
];

const TOOL_COST = 60;

const Investigation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [category, setCategory] = useState("");
  const [reportText, setReportText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [achievementTemplates, setAchievementTemplates] = useState<AchievementTemplate[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [purchasingTool, setPurchasingTool] = useState<string | null>(null);

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
      fetchReports();
      fetchAchievementTemplates();
      fetchProfile();
      const channel = supabase
        .channel('daily_reports_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'daily_reports'
          },
          (payload) => {
            setReports((current) => [payload.new as DailyReport, ...current]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchReports = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
    } else {
      setReports(data || []);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('ap, magnifying_glass_level, lantern_level, compass_level')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data);
    }
  };

  const fetchAchievementTemplates = async () => {
    const { data, error } = await supabase
      .from('achievement_templates')
      .select('*')
      .eq('category', 'daily_investigation')
      .order('ap_reward', { ascending: true });

    if (error) {
      console.error('Error fetching achievement templates:', error);
    } else {
      setAchievementTemplates(data || []);
    }
  };

  const handlePurchaseTool = async (toolName: string, toolField: 'magnifying_glass_level' | 'lantern_level' | 'compass_level') => {
    if (!user || !profile) return;

    if (profile.ap < TOOL_COST) {
      toast({
        title: "APが不足しています",
        description: `${TOOL_COST} AP必要です（現在: ${profile.ap} AP）`,
        variant: "destructive",
      });
      return;
    }

    setPurchasingTool(toolField);

    const currentCount = profile[toolField] || 0;

    const { error } = await supabase
      .from("profiles")
      .update({
        ap: profile.ap - TOOL_COST,
        [toolField]: currentCount + 1,
      })
      .eq("id", user.id);

    setPurchasingTool(null);

    if (error) {
      toast({
        title: "エラー",
        description: "購入に失敗しました",
        variant: "destructive",
      });
    } else {
      toast({
        title: "購入成功！",
        description: `${toolName}を1個入手しました！`,
      });
      fetchProfile();
    }
  };

  const handleSubmit = async () => {
    // Validation: category is required
    if (!category) {
      toast({
        title: "入力エラー",
        description: "カテゴリーを選択してください",
        variant: "destructive",
      });
      return;
    }

    // Validation: either image or text is required
    if (!imageFile && !reportText.trim()) {
      toast({
        title: "入力エラー",
        description: "写真または調査記録のどちらか一方は必須です",
        variant: "destructive",
      });
      return;
    }

    // File validation for image uploads
    if (imageFile) {
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      
      if (imageFile.size > MAX_FILE_SIZE) {
        toast({
          title: "エラー",
          description: "ファイルサイズは5MB以下にしてください",
          variant: "destructive",
        });
        return;
      }
      
      if (!ALLOWED_TYPES.includes(imageFile.type)) {
        toast({
          title: "エラー",
          description: "JPG、PNG、WebP、GIF形式のみ対応しています",
          variant: "destructive",
        });
        return;
      }
    }

    if (!user) {
      toast({
        title: "エラー",
        description: "ログインが必要です",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    let imageUrl: string | null = null;

    // Upload image if provided
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('investigation-photos')
        .upload(fileName, imageFile);

      if (uploadError) {
        setSubmitting(false);
        toast({
          title: "エラー",
          description: "画像のアップロードに失敗しました",
          variant: "destructive",
        });
        return;
      }

      // Use signed URL for private bucket access
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('investigation-photos')
        .createSignedUrl(fileName, 31536000); // 1 year expiry

      if (urlError) {
        setSubmitting(false);
        toast({
          title: "エラー",
          description: "画像URLの生成に失敗しました",
          variant: "destructive",
        });
        return;
      }

      imageUrl = signedUrlData.signedUrl;
    }

    // Calculate AP based on category
    const selectedCategory = CATEGORIES.find(c => c.value === category);
    const apAwarded = selectedCategory?.ap || 20;

    const { error } = await supabase
      .from('daily_reports')
      .insert({
        user_id: user.id,
        category: category,
        report_text: reportText.trim() || null,
        image_url: imageUrl,
      });

    if (!error) {
      // Update user's AP and streak
      const { data: profile } = await supabase
        .from('profiles')
        .select('ap, current_streak, last_log_date')
        .eq('id', user.id)
        .single();

      if (profile) {
        // Get current date in JST (Japan Standard Time)
        const nowJST = toZonedTime(new Date(), 'Asia/Tokyo');
        const today = format(nowJST, 'yyyy-MM-dd');
        const yesterdayJST = toZonedTime(subDays(new Date(), 1), 'Asia/Tokyo');
        const yesterday = format(yesterdayJST, 'yyyy-MM-dd');
        
        let newStreak = 1;
        let streakIncreased = false;
        
        if (profile.last_log_date === today) {
          // Already reported today, don't update streak
          newStreak = profile.current_streak || 1;
        } else if (profile.last_log_date === yesterday) {
          // Continuing streak
          newStreak = (profile.current_streak || 0) + 1;
          streakIncreased = true;
        } else {
          // Streak broken, reset to 1
          newStreak = 1;
        }

        await supabase
          .from('profiles')
          .update({ 
            ap: (profile.ap || 0) + apAwarded,
            current_streak: newStreak,
            last_log_date: today
          })
          .eq('id', user.id);

        // Show streak notification if streak increased
        if (streakIncreased && profile.last_log_date !== today) {
          toast({
            title: `🔥 ${newStreak}日連続報告達成！`,
            description: `素晴らしい！毎日の積み重ねが君を強くする。`,
            duration: 5000,
          });
        }

        // Check and grant streak achievements
        const streakAchievements = [
          { id: 'streak_3_days', days: 3 },
          { id: 'streak_7_days', days: 7 },
          { id: 'streak_30_days', days: 30 }
        ];

        for (const achievement of streakAchievements) {
          if (newStreak >= achievement.days) {
            // Check if achievement already exists
            const { data: existing } = await supabase
              .from('achievements')
              .select('id')
              .eq('user_id', user.id)
              .eq('template_id', achievement.id)
              .maybeSingle();

            if (!existing) {
              // Get achievement template details
              const { data: template } = await supabase
                .from('achievement_templates')
                .select('*')
                .eq('id', achievement.id)
                .single();

              if (template) {
                await supabase
                  .from('achievements')
                  .insert({
                    user_id: user.id,
                    template_id: template.id,
                    achievement_type: 'streak',
                    name: template.name,
                    description: template.description,
                    icon: template.icon
                  });

                // Award AP for achievement
                await supabase
                  .from('profiles')
                  .update({ 
                    ap: (profile.ap || 0) + apAwarded + template.ap_reward
                  })
                  .eq('id', user.id);
              }
            }
          }
        }

        // Check and grant daily report count achievements
        const { count: reportCount } = await supabase
          .from('daily_reports')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (reportCount !== null) {
          // Get all daily report achievements
          const { data: reportAchievementTemplates } = await supabase
            .from('achievement_templates')
            .select('*')
            .eq('requirement_type', 'daily_reports')
            .order('requirement_value', { ascending: true });

          if (reportAchievementTemplates) {
            for (const template of reportAchievementTemplates) {
              if (reportCount >= template.requirement_value) {
                // Check if achievement already exists
                const { data: existing } = await supabase
                  .from('achievements')
                  .select('id')
                  .eq('user_id', user.id)
                  .eq('template_id', template.id)
                  .maybeSingle();

                if (!existing) {
                  await supabase
                    .from('achievements')
                    .insert({
                      user_id: user.id,
                      template_id: template.id,
                      achievement_type: 'daily_report',
                      name: template.name,
                      description: template.description,
                      icon: template.icon
                    });

                  // Award AP for achievement
                  const { data: currentProfile } = await supabase
                    .from('profiles')
                    .select('ap')
                    .eq('id', user.id)
                    .single();

                  if (currentProfile) {
                    await supabase
                      .from('profiles')
                      .update({ 
                        ap: (currentProfile.ap || 0) + template.ap_reward
                      })
                      .eq('id', user.id);
                    
                    toast({
                      title: "🏆 新しい功績を獲得！",
                      description: `${template.icon} ${template.name} (+${template.ap_reward} AP)`,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    setSubmitting(false);

    if (error) {
      toast({
        title: "エラー",
        description: "報告の送信に失敗しました",
        variant: "destructive",
      });
    } else {
      toast({
        title: "報告を送信しました",
        description: `+${apAwarded} AP獲得！探偵としての経験値が蓄積されています...`,
      });
      setCategory("");
      setReportText("");
      setImageFile(null);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "ゴミ拾い":
        return <Search className="w-4 h-4 text-primary" />;
      case "エコな選択":
        return <Book className="w-4 h-4 text-primary" />;
      case "地域イベント参加":
        return <Coffee className="w-4 h-4 text-primary" />;
      case "会話":
        return <Coffee className="w-4 h-4 text-primary" />;
      case "観察・調査":
        return <Eye className="w-4 h-4 text-primary" />;
      default:
        return <Clock className="w-4 h-4 text-primary" />;
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
      <div className="container max-w-2xl mx-auto p-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            日々の調査報告
          </h1>
          <p className="text-muted-foreground">
            日常で発見した手がかりを記録しましょう
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>新たな「手がかり」を報告</CardTitle>
            <CardDescription>
              活動カテゴリを選択し、証拠写真または調査記録を入力してください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">活動カテゴリを選択（必須）</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="カテゴリーを選択" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label} (+{cat.ap} AP)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {category && (
                <p className="text-sm text-muted-foreground mt-2">
                  {CATEGORIES.find(c => c.value === category)?.description}
                </p>
              )}
            </div>

            {category && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">証拠写真（任意）</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    活動の様子がわかる写真をアップロードできます。
                  </p>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      {imageFile ? (
                        <p className="text-sm font-medium">{imageFile.name}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          クリックして写真を選択
                        </p>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">調査記録（任意）</label>
                  <Textarea
                    placeholder="発見した内容や、あなたの「気づき」を自由に記録してください..."
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    rows={5}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  ※ 写真または調査記録の、どちらか一方の入力は必須です。
                </p>
              </>
            )}

            <Button 
              onClick={handleSubmit} 
              className="w-full" 
              disabled={submitting || !category || (!imageFile && !reportText.trim())}
            >
              {submitting ? "送信中..." : "調査報告を提出する"}
            </Button>
          </CardContent>
        </Card>

        {/* Tool Workshop */}
        {profile && (
          <Card className="shadow-card p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🔧</span>
                調査道具工房
              </CardTitle>
              <CardDescription>
                APを使って探偵道具を入手しましょう（現在: {profile.ap || 0} AP）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {TOOLS.map((tool) => {
                const Icon = tool.icon;
                const currentCount = profile[tool.dbField] || 0;
                const canAfford = profile.ap >= TOOL_COST;

                return (
                  <div key={tool.dbField} className={`bg-gradient-to-r from-${tool.color}/10 to-${tool.color}/5 p-4 rounded-lg border-2`} style={{ 
                    background: `linear-gradient(to right, ${tool.color}20, ${tool.color}10)`,
                    borderColor: `${tool.color}30`
                  }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">
                          {tool.name === "観察ルーペ" ? "🔍" : tool.name === "調査ランタン" ? "💡" : "🧭"}
                        </span>
                        <div>
                          <p className="font-bold text-sm">{tool.name}</p>
                          <p className="text-xs text-muted-foreground">所持: {currentCount}個</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handlePurchaseTool(tool.name, tool.dbField)}
                        disabled={purchasingTool === tool.dbField || !canAfford}
                        size="sm"
                        className="font-bold"
                      >
                        {purchasingTool === tool.dbField ? "購入中..." : `${TOOL_COST} AP`}
                      </Button>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground text-center mt-4">
                ※ 道具1個につき、イベント内で1つのヒントが解放されます
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>過去の報告</CardTitle>
            <CardDescription>これまでの探偵活動の記録</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                まだ報告がありません
              </p>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-start space-x-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="mt-1">{getCategoryIcon(report.category)}</div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">{report.category}</p>
                    {report.image_url && (
                      <img 
                        src={report.image_url} 
                        alt="活動の証拠写真" 
                        className="w-full max-w-md rounded-lg mt-2 mb-2"
                      />
                    )}
                    {report.report_text && (
                      <p className="text-sm">{report.report_text}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(report.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              報告で「功績」をアンロック
            </CardTitle>
            <CardDescription>
              調査報告は、すべて「功績」として記録される。「累計10回報告」「ごみ拾い5回達成」など、特定の条件をクリアすることで、特別な功績バッジが与えられる。功績はあなたの「累計AP」を増やし、より上の「称号」へと導くのだ。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {achievementTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{template.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-bold text-primary">+{template.ap_reward} AP</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-foreground">
              💡 <strong>ヒント:</strong> 日常の小さな行動が、より難しい依頼への挑戦権や功績バッジの獲得につながります。
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Investigation;
