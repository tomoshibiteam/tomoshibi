import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Home, FileText, Wrench, BookOpen } from "lucide-react";

interface TutorialModalProps {
  isOpen: boolean;
  onComplete: () => void;
  userId: string;
}

const TutorialModal = ({ isOpen, onComplete, userId }: TutorialModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleComplete = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ has_completed_tutorial: true })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "チュートリアル完了",
        description: "TOMOSHIBIの冒険を始めましょう！",
      });

      onComplete();
    } catch (error) {
      console.error('Error completing tutorial:', error);
      toast({
        title: "エラー",
        description: "チュートリアルの完了処理に失敗しました",
        variant: "destructive",
      });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                ようこそ、TOMOSHIBIへ
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                TOMOSHIBIは、街歩きと物語、謎解きをつなぐ冒険アプリです。<br />
                まずは「生成から保存、プレイ」までの流れを押さえましょう。
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                ① クエストを生成する
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Home画面で灯火を選び、AIにクエストを生成させます。<br />
                場所や雰囲気を指定するほど、あなたらしい冒険になります。
              </p>
            </div>
            <div className="flex justify-center items-center gap-2 text-sm text-primary animate-pulse">
              <FileText className="w-5 h-5" />
              <span>フッターの「Home」から生成できます</span>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Home className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                ② 保存して一覧に追加
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                生成結果を保存すると、プロフィールや一覧からいつでも再開できます。<br />
                自分のクエストは公開前でもそのままプレイ可能です。
              </p>
            </div>
            <div className="flex justify-center items-center gap-2 text-sm text-primary animate-pulse">
              <Home className="w-5 h-5" />
              <span>保存後は「Explore」やプロフィールから確認できます</span>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Wrench className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                ③ 現地でプレイする
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                プレイ画面ではGPSを有効にし、地図と物語に沿って進みます。<br />
                会話と謎解きは下部シートで切り替わります。準備ができたら始めましょう。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30">
                <Wrench className="w-5 h-5 text-primary" />
                <span className="text-xs text-muted-foreground">GPSと地図</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="text-xs text-muted-foreground">物語と謎</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[500px] bg-background/95 backdrop-blur-sm"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">
          チュートリアル - ステップ {currentStep} / {totalSteps}
        </DialogTitle>
        
        <div className="py-6">
          {renderStep()}
        </div>

        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index + 1 === currentStep
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          {currentStep < totalSteps ? (
            <Button
              onClick={handleNext}
              className="w-full"
              size="lg"
            >
              次へ
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              className="w-full"
              size="lg"
            >
              冒険を始める
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TutorialModal;
