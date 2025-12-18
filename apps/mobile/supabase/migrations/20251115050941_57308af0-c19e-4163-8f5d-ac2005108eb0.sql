-- 道具システムをレベルから個数ベースに変更
-- 既存のフィールドを個数として再利用し、デフォルト値を0に変更

ALTER TABLE public.profiles 
  ALTER COLUMN magnifying_glass_level SET DEFAULT 0,
  ALTER COLUMN lantern_level SET DEFAULT 0,
  ALTER COLUMN compass_level SET DEFAULT 0;

-- 既存のレコードのレベルをリセット（個数0からスタート）
UPDATE public.profiles 
SET 
  magnifying_glass_level = 0,
  lantern_level = 0,
  compass_level = 0;