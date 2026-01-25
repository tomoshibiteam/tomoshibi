/**
 * シェア機能のユーティリティ関数（リファラルコード機能を無効化）
 */

interface ShareOptions {
  title?: string;
  text: string;
}

/**
 * 固定URLを返す
 */
export const getAppUrl = (): string => {
  const base = import.meta.env.BASE_URL || "/";
  if (typeof window === "undefined") return base;
  return `${window.location.origin}${base}`;
};

/**
 * OS標準のシェア機能を呼び出す
 * navigator.shareが使えない場合はクリップボードにコピー
 */
export const triggerShare = async (options: ShareOptions): Promise<boolean> => {
  const { title = "TOMOSHIBI", text } = options;
  const url = getAppUrl();
  const fullText = `${text} ${url}`;

  // Web Share API が利用可能かチェック
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text: fullText,
      });
      return true;
    } catch (error) {
      // ユーザーがシェアをキャンセルした場合
      if ((error as Error).name === 'AbortError') {
        return false;
      }
      console.error('Share failed:', error);
      // フォールバック処理へ
    }
  }

  // フォールバック: テキストとURLをクリップボードにコピー
  try {
    await navigator.clipboard.writeText(fullText);
    return true;
  } catch (error) {
    console.error('Clipboard copy failed:', error);
    return false;
  }
};

/**
 * 功績達成時のシェアメッセージを生成
 */
export const createAchievementShareText = (achievementName: string): string => {
  return `功績「${achievementName}」を獲得しました！ 君もTOMOSHIBIで一緒に謎を解こう！ #TOMOSHIBI`;
};

/**
 * 称号昇格時のシェアメッセージを生成
 */
export const createTitleShareText = (titleName: string): string => {
  return `ランクが「${titleName}」に昇格しました！ 君もTOMOSHIBIで一緒に謎を解こう！ #TOMOSHIBI`;
};

/**
 * プロフィールシェア時のメッセージを生成
 */
export const createProfileShareText = (titleName: string): string => {
  return `私の現在のランクは「${titleName}」です。君もTOMOSHIBIで一緒に謎を解こう！ #TOMOSHIBI`;
};
