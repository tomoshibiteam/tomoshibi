import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // 既にPWAとして起動している場合は何も表示しない
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // iOSデバイスかどうかを判定
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // バナーを既に閉じたかチェック
    const bannerDismissed = localStorage.getItem('installBannerDismissed');
    
    if (!bannerDismissed) {
      if (isIOSDevice) {
        // iOSの場合は即座にバナーを表示
        setShowBanner(true);
      } else {
        // Android/Chromeの場合はbeforeinstallpromptイベントを待つ
        const handler = (e: Event) => {
          e.preventDefault();
          setDeferredPrompt(e as BeforeInstallPromptEvent);
          setShowBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
          window.removeEventListener('beforeinstallprompt', handler);
        };
      }
    }
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      // iOSの場合は説明ダイアログを表示
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    // Android/Chromeの場合はインストールプロンプトを表示
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowBanner(false);
      localStorage.setItem('installBannerDismissed', 'true');
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('installBannerDismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <>
      <Card className="p-3 sm:p-4 bg-white dark:bg-card border-[#DED8CE] dark:border-border shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="flex items-start sm:items-center gap-2 sm:gap-3">
          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#006400]/10 flex items-center justify-center">
            {isIOS ? (
              <Share className="w-4 h-4 sm:w-5 sm:h-5 text-[#006400]" />
            ) : (
              <Download className="w-4 h-4 sm:w-5 sm:h-5 text-[#006400]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-[15px] text-[#4E443B] leading-tight">
              {isIOS 
                ? "アプリのように使おう！"
                : "ホーム画面に追加"
              }
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={handleInstall}
              className="bg-[#006400] hover:bg-[#005000] text-white font-bold px-2 sm:px-4 text-xs sm:text-sm rounded-lg h-8"
            >
              {isIOS ? "手順" : "追加"}
            </Button>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
              aria-label="閉じる"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </Card>

      {/* iOS用の手順説明ダイアログ */}
      <AlertDialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">
              ホーム画面に追加する方法
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#006400] text-white flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground">
                      画面下部の<Share className="w-4 h-4 inline mx-1" />「共有」ボタンをタップ
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#006400] text-white flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground">
                      「ホーム画面に追加」を選択
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#006400] text-white flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground">
                      画面右上の「追加」をタップして完了！
                    </p>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground text-center pt-2">
                  ホーム画面からアプリのように起動できます
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Button
            onClick={() => {
              setShowIOSInstructions(false);
              setShowBanner(false);
              localStorage.setItem('installBannerDismissed', 'true');
            }}
            className="w-full bg-[#006400] hover:bg-[#005000]"
          >
            閉じる
          </Button>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default InstallBanner;
