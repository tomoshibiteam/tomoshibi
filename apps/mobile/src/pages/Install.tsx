import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Smartphone, Check, ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // PWAが既にインストール済みかチェック
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        {/* Header */}
        <div className="bg-background px-6 pt-6 pb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            ホームに戻る
          </Button>
          
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Download className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              アプリをインストール
            </h1>
            <p className="text-sm text-muted-foreground">
              ホーム画面に追加して、いつでもすぐに冒険を開始
            </p>
          </div>

          {/* Install Status */}
          {isInstalled ? (
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">
                インストール済み
              </h2>
              <p className="text-sm text-muted-foreground">
                TOMOSHIBIアプリは既にインストールされています
              </p>
            </Card>
          ) : deferredPrompt ? (
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 text-center">
              <Button
                size="lg"
                onClick={handleInstall}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold mb-3"
              >
                <Download className="w-5 h-5 mr-2" />
                ワンクリックでインストール
              </Button>
              <p className="text-xs text-muted-foreground">
                ボタンをタップしてホーム画面に追加
              </p>
            </Card>
          ) : (
            <Card className="p-6 bg-muted/50 border-border text-center">
              <p className="text-sm text-muted-foreground">
                このブラウザではワンクリックインストールに対応していません。<br />
                下記の手動インストール手順をご確認ください。
              </p>
            </Card>
          )}
        </div>

        <div className="px-6 space-y-6 pb-6">
          {/* Benefits */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4">
              アプリ版の特典
            </h2>
            <div className="space-y-3">
              <Card className="p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">⚡</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-1">高速アクセス</h3>
                    <p className="text-xs text-muted-foreground">
                      ホーム画面から即座に起動。ブラウザを開く手間が不要
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📱</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-1">アプリライクな体験</h3>
                    <p className="text-xs text-muted-foreground">
                      フルスクリーン表示で、没入感のある冒険体験
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">💾</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-1">オフライン対応</h3>
                    <p className="text-xs text-muted-foreground">
                      一部のコンテンツは、オフラインでも閲覧可能
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🔔</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-1">プッシュ通知（予定）</h3>
                    <p className="text-xs text-muted-foreground">
                      新しい依頼や重要な更新を通知でお知らせ
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Manual Installation Guide */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4">
              手動インストール手順
            </h2>
            
            {/* iOS Safari */}
            <Card className="p-5 shadow-card mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base">iOS（Safari）</h3>
                <Badge variant="secondary" className="ml-auto text-xs">iPhone・iPad</Badge>
              </div>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</span>
                  <span>Safariブラウザで本サイトを開く</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</span>
                  <span>画面下部の<strong>「共有」ボタン</strong>（□↑）をタップ</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</span>
                  <span><strong>「ホーム画面に追加」</strong>を選択</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">4</span>
                  <span>右上の<strong>「追加」</strong>をタップして完了</span>
                </li>
              </ol>
            </Card>

            {/* Android Chrome */}
            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base">Android（Chrome）</h3>
                <Badge variant="secondary" className="ml-auto text-xs">Android</Badge>
              </div>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</span>
                  <span>Chromeブラウザで本サイトを開く</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</span>
                  <span>画面右上の<strong>「︙」メニュー</strong>をタップ</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</span>
                  <span><strong>「ホーム画面に追加」</strong>または<strong>「アプリをインストール」</strong>を選択</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">4</span>
                  <span><strong>「追加」</strong>または<strong>「インストール」</strong>をタップして完了</span>
                </li>
              </ol>
            </Card>
          </div>

          {/* Support */}
          <Card className="p-5 shadow-card bg-muted/30">
            <h3 className="font-bold text-sm mb-2">💡 インストールに関するヒント</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>• インストール後は、ホーム画面のアイコンから起動できます</li>
              <li>• アンインストールは、通常のアプリと同様に長押しで削除可能です</li>
              <li>• アプリ版でも、最新の情報が自動的に反映されます</li>
            </ul>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Install;
