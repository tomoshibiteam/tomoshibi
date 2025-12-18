-- Step 0: リファラル機能の無効化

-- profilesテーブルからリファラル関連のフィールドを削除
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS referral_code,
DROP COLUMN IF EXISTS referred_by_id;

-- リクルーター関連の功績を削除
DELETE FROM public.achievement_templates 
WHERE name IN ('新米リクルーター', '敏腕スカウト');