import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface TitleTemplate {
  id: string;
  name: string;
  ap_required: number;
  rank_order: number;
}

interface UserProfile {
  total_ap: number;
  current_title_id: string;
}

const RankHierarchy = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [titles, setTitles] = useState<TitleTemplate[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

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
      fetchTitles();
      fetchProfile();
    }
  }, [user]);

  const fetchTitles = async () => {
    const { data, error } = await supabase
      .from('title_templates')
      .select('*')
      .order('ap_required', { ascending: true });

    if (error) {
      console.error('Error fetching titles:', error);
    } else if (data) {
      setTitles(data);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('total_ap, current_title_id')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
    } else if (data) {
      setProfile(data);
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
      <div className="container max-w-2xl mx-auto p-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile")}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          戻る
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            ランクキャリアパス
          </h1>
          <p className="text-muted-foreground">
            累計AP (totalAP) が貯まると、あなたのランクが自動的に昇格します。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>全15階層</CardTitle>
            <CardDescription>
              現在の累計AP: {profile.total_ap} AP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {titles.map((title) => {
                const isUnlocked = profile.total_ap >= title.ap_required;
                const isCurrent = title.id === profile.current_title_id;

                return (
                  <div
                    key={title.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                      isCurrent
                        ? 'bg-primary/10 border-primary shadow-md'
                        : isUnlocked
                        ? 'bg-card border-border'
                        : 'bg-muted/30 border-muted opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`text-2xl ${isUnlocked ? 'text-primary' : 'text-muted-foreground'}`}>
                        {isUnlocked ? (
                          <Unlock className="w-6 h-6" />
                        ) : (
                          <Lock className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <p
                          className={`font-semibold ${
                            isCurrent
                              ? 'text-primary text-lg'
                              : isUnlocked
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {title.name}
                        </p>
                        {isCurrent && (
                          <Badge variant="default" className="mt-1 text-xs">
                            現在の称号
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${
                          isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {title.ap_required.toLocaleString()} AP～
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Lv. {title.rank_order}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default RankHierarchy;
