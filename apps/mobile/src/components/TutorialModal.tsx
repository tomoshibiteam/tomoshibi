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
        description: "探偵活動を開始しましょう！",
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
                ようこそ、新米調査員
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                本日より、君も「SPR探偵事務所」の一員だ。<br />
                この「探偵手帳」アプリは、君の調査活動を支援する相棒となる。<br />
                まずは、基本的な任務の流れを説明しよう。
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
                ① 日々の「捜査報告」
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                我々の調査は日常にある。「ゴミ拾い」や「エコな選択」など、君が街で発見した「手がかり」を、「調査報告」から報告してほしい。<br />
                報告は「AP (功績ポイント)」として蓄積され、君の探偵ランクや道具の強化に繋がる。
              </p>
            </div>
            <div className="flex justify-center items-center gap-2 text-sm text-primary animate-pulse">
              <FileText className="w-5 h-5" />
              <span>フッターの「調査報告」アイコンから報告できます</span>
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
                ②「特別調査任務」への参加
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                「依頼」タブには、君が現地で挑むべき「特別調査任務（謎解きゲーム）」がリストアップされている。<br />
                任務をクリアすれば、多額のAPと特別な功績が与えられる。<br />
                日常で育てた「調査道具」が、任務中のヒントとして君を助けるだろう。
              </p>
            </div>
            <div className="flex justify-center items-center gap-2 text-sm text-primary animate-pulse">
              <Home className="w-5 h-5" />
              <span>フッターの「依頼」アイコンから確認できます</span>
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
                ③ 手帳と道具の確認
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                「道具工房」ではAPを消費して君の道具を強化できる。<br />
                「手帳」では、君の現在の「称号（ランク）」や獲得した「功績バッジ」をいつでも確認可能だ。<br />
                準備はいいかな？
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30">
                <Wrench className="w-5 h-5 text-primary" />
                <span className="text-xs text-muted-foreground">道具工房</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="text-xs text-muted-foreground">手帳</span>
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
              捜査を開始する
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TutorialModal;
