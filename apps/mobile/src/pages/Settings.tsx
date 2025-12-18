import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Plus, X } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notificationTimes, setNotificationTimes] = useState<string[]>(["22:00"]);
  const [saving, setSaving] = useState(false);

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
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('notification_enabled, notification_time')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
    } else if (data) {
      setNotificationEnabled(data.notification_enabled ?? true);
      
      // Parse notification_time as JSON array if it's stored as JSON
      try {
        const times = data.notification_time ? JSON.parse(data.notification_time) : ["22:00"];
        setNotificationTimes(Array.isArray(times) ? times : [times]);
      } catch {
        // If it's a single time string, convert to array
        setNotificationTimes([data.notification_time ?? "22:00"]);
      }
    }
  };

  const handleAddTime = () => {
    if (notificationTimes.length < 5) {
      setNotificationTimes([...notificationTimes, "22:00"]);
    }
  };

  const handleRemoveTime = (index: number) => {
    if (notificationTimes.length > 1) {
      setNotificationTimes(notificationTimes.filter((_, i) => i !== index));
    }
  };

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...notificationTimes];
    newTimes[index] = value;
    setNotificationTimes(newTimes);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    // Store notification times as JSON array
    const { error } = await supabase
      .from('profiles')
      .update({
        notification_enabled: notificationEnabled,
        notification_time: JSON.stringify(notificationTimes)
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      toast({
        title: "エラー",
        description: "設定の保存に失敗しました",
        variant: "destructive",
      });
    } else {
      toast({
        title: "保存しました",
        description: "通知設定を更新しました",
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
      <div className="container max-w-2xl mx-auto p-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            設定
          </h1>
          <p className="text-muted-foreground">
            通知とアプリの設定
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-primary" />
              <span>通知設定</span>
            </CardTitle>
            <CardDescription>
              連続捜査記録のリマインド通知を設定します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notification-toggle" className="text-base font-medium">
                  ストリーク通知
                </Label>
                <p className="text-sm text-muted-foreground">
                  連続捜査記録が途切れそうな場合、リマインド通知を受け取ります
                </p>
              </div>
              <Switch
                id="notification-toggle"
                checked={notificationEnabled}
                onCheckedChange={setNotificationEnabled}
              />
            </div>

            {notificationEnabled && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    通知時間
                  </Label>
                  {notificationTimes.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTime}
                      className="flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      追加
                    </Button>
                  )}
                </div>
                
                <div className="space-y-3">
                  {notificationTimes.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => handleTimeChange(index, e.target.value)}
                        className="flex-1 px-4 py-2 rounded-md border border-input bg-background text-foreground"
                      />
                      {notificationTimes.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTime(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  設定した時刻に毎日通知をお送りします（最大5回）
                </p>
              </div>
            )}

            <div className="pt-4">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full"
              >
                {saving ? "保存中..." : "設定を保存"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium">💡 ヒント</p>
              <p>
                連続捜査記録を途切れさせないために、毎日「手がかり」を報告しましょう。
                通知時間は、あなたが報告しやすい時間帯に設定することをおすすめします。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
