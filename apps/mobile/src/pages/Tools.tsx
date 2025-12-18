import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, Lightbulb, Compass, Trophy } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ToolConfig {
  name: string;
  icon: typeof Search;
  dbField: "magnifying_glass_level" | "lantern_level" | "compass_level";
  color: string;
}

const TOOLS: ToolConfig[] = [
  {
    name: "観察ルーペ",
    icon: Search,
    dbField: "magnifying_glass_level",
    color: "#FFD700",
  },
  {
    name: "調査ランタン",
    icon: Lightbulb,
    dbField: "lantern_level",
    color: "#FFA500",
  },
  {
    name: "方位コンパス",
    icon: Compass,
    dbField: "compass_level",
    color: "#4169E1",
  },
];

const TOOL_COST = 60;

const Tools = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
    } else {
      setProfile(data);
    }
  };

  const handlePurchase = async (tool: ToolConfig) => {
    if (!user || !profile) return;

    const currentCount = profile[tool.dbField] || 0;

    if (profile.ap < TOOL_COST) {
      toast({
        title: "APが不足しています",
        description: `${TOOL_COST} AP必要です（現在: ${profile.ap} AP）`,
        variant: "destructive",
      });
      return;
    }

    setUpgrading(tool.dbField);

    const { error } = await supabase
      .from("profiles")
      .update({
        ap: profile.ap - TOOL_COST,
        [tool.dbField]: currentCount + 1,
      })
      .eq("id", user.id);

    setUpgrading(null);

    if (error) {
      toast({
        title: "エラー",
        description: "購入に失敗しました",
        variant: "destructive",
      });
    } else {
      toast({
        title: "購入成功！",
        description: `${tool.name}を1個入手しました！`,
      });
      fetchProfile();
    }
  };

  if (loading || !profile) {
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
      <div className="container max-w-4xl mx-auto p-6 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">調査道具工房</h1>
          <p className="text-muted-foreground mb-6">
            APを使って探偵道具を入手しましょう
          </p>
          <div className="inline-flex items-center gap-2 bg-accent/20 px-6 py-3 rounded-full">
            <Trophy className="w-5 h-5 text-accent" />
            <span className="text-2xl font-bold">{profile.ap}</span>
            <span className="text-sm text-muted-foreground">AP</span>
          </div>
        </div>


        <div className="grid gap-6 md:grid-cols-1">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const currentCount = profile[tool.dbField] || 0;
            const canAfford = profile.ap >= TOOL_COST;

            return (
              <Card key={tool.dbField} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-3 rounded-full"
                        style={{ backgroundColor: `${tool.color}20` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: tool.color }} />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{tool.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          所持数: {currentCount}個
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tool Info */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      道具1個につき、イベント内で1つの特別なヒントを解放できます。
                    </p>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handlePurchase(tool)}
                    disabled={upgrading === tool.dbField || !canAfford}
                    className="w-full"
                    size="lg"
                  >
                    {upgrading === tool.dbField ? (
                      "購入中..."
                    ) : (
                      <>
                        {TOOL_COST} APで購入する
                        {!canAfford && " (AP不足)"}
                      </>
                    )}
                  </Button>

                  {/* Usage Example */}
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-sm font-semibold text-muted-foreground">
                      使い方
                    </p>
                    <div className="grid gap-2">
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-accent mt-1.5" />
                        <span>イベント中に道具が必要な場面で自動的に使用されます</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-accent mt-1.5" />
                        <span>使用後は消費されるので、事前に複数個入手しておきましょう</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Tools;
