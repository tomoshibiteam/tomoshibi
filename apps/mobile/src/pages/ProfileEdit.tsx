import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().trim().min(1, "名前を入力してください").max(50, "名前は50文字以内で入力してください"),
  bio: z.string().max(150, "自己紹介は150文字以内で入力してください").optional(),
});

const ProfileEdit = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; bio?: string }>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('name, bio, profile_picture_url')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "エラー",
        description: "プロフィール情報の取得に失敗しました",
        variant: "destructive",
      });
    } else if (data) {
      setName(data.name || '');
      setBio(data.bio || '');
      setProfilePictureUrl(data.profile_picture_url || '');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "エラー",
        description: "画像ファイルを選択してください",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "エラー",
        description: "ファイルサイズは5MB以下にしてください",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('investigation-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('investigation-photos')
        .getPublicUrl(filePath);

      setProfilePictureUrl(publicUrl);

      toast({
        title: "アップロード完了",
        description: "プロフィール画像をアップロードしました",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "エラー",
        description: "画像のアップロードに失敗しました",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate inputs
    const result = profileSchema.safeParse({ name, bio });

    if (!result.success) {
      const fieldErrors: { name?: string; bio?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'name') fieldErrors.name = err.message;
        if (err.path[0] === 'bio') fieldErrors.bio = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          bio: bio.trim() || null,
          profile_picture_url: profilePictureUrl || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "保存しました",
        description: "プロフィールを更新しました",
      });

      navigate("/profile");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "エラー",
        description: "プロフィールの更新に失敗しました",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profile")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">プロフィールを編集</h1>
      </div>

      <Card className="p-6 space-y-6">
        {/* Profile Picture */}
        <div className="space-y-2">
          <Label>探偵の顔写真</Label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center">
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt="プロフィール画像"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="cursor-pointer"
              />
              {uploading && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  アップロード中...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">探偵名</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="探偵名を入力"
            maxLength={50}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">自己紹介</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="あなたの探偵としての信念や、好きなことを記録しよう（150文字以内）"
            maxLength={150}
            rows={4}
          />
          <div className="flex justify-between items-center">
            {errors.bio && (
              <p className="text-sm text-destructive">{errors.bio}</p>
            )}
            <p className="text-xs text-muted-foreground ml-auto">
              {bio.length} / 150文字
            </p>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving || uploading}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            "保存する"
          )}
        </Button>
      </Card>
    </div>
  );
};

export default ProfileEdit;
