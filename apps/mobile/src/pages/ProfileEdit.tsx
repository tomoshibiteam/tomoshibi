import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Loader2, X } from "lucide-react";
import { z } from "zod";
import Cropper from "react-easy-crop";
import getCroppedImg, { PixelCrop } from "@/lib/canvasUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

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

  // Cropping State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isCropping, setIsCropping] = useState(false);

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

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, bio, profile_picture_url')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('ProfileEdit: Error fetching profile (likely missing columns):', error);
      } else if (data) {
        setName(data.name || '');
        setBio(data.bio || '');
        setProfilePictureUrl(data.profile_picture_url || '');
      }
    } catch (e) {
      console.warn('ProfileEdit: Unexpected fetch error:', e);
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: PixelCrop) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "エラー",
          description: "画像ファイルを選択してください",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result?.toString() || "");
        setIsCropping(true);
      });
      reader.readAsDataURL(file);
      // Reset input value so the same file can be selected again
      e.target.value = "";
    }
  };

  const uploadCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels || !user) return;

    setUploading(true);
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      if (!croppedImageBlob) {
        throw new Error("画像の切り抜きに失敗しました");
      }

      const fileExt = "jpg";
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedImageBlob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfilePictureUrl(publicUrl);
      setIsCropping(false);
      setImageSrc(null);

      toast({
        title: "完了",
        description: "画像を更新しました",
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
      <div className="min-h-screen flex items-center justify-center bg-[#FEF9F3]">
        <div className="w-8 h-8 border-2 border-[#D87A32] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FEF9F3] pb-24 px-4 font-serif text-[#3D2E1F]">
      {/* Cinematic Vignette */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_transparent_10%,_#E8D5BE_120%)] z-0 pointer-events-none opacity-60" />

      <div className="relative z-10 pt-6 mb-8 flex items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profile")}
          className="absolute left-0 rounded-full hover:bg-[#E8D5BE]/20 text-[#3D2E1F]"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold tracking-widest">プロフィール編集</h1>
      </div>

      <div className="relative z-10 max-w-md mx-auto space-y-8">

        {/* Profile Picture */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-[#E8D5BE] border-4 border-white shadow-md">
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="w-10 h-10 text-[#FEF9F3]" />
                </div>
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 p-2.5 rounded-full bg-[#D87A32] text-white shadow-lg cursor-pointer hover:bg-[#B85A1F] transition-colors active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-[#7A6652] tracking-wide">
            画像をタップして変更
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-6 bg-white/60 p-6 rounded-3xl border border-[#E8D5BE] shadow-sm">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-bold text-[#7A6652] tracking-widest uppercase">
              名前
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="名前を入力"
              maxLength={50}
              className="bg-transparent border-0 border-b border-[#E8D5BE] rounded-none px-0 focus-visible:ring-0 focus-visible:border-[#D87A32] font-serif text-lg text-[#3D2E1F] placeholder:text-[#3D2E1F]/30"
            />
            {errors.name && (
              <p className="text-xs text-[#B85A1F]">{errors.name}</p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-xs font-bold text-[#7A6652] tracking-widest uppercase">
              自己紹介
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="自己紹介を入力してください"
              maxLength={150}
              rows={4}
              className="bg-[#FEF9F3]/50 border border-[#E8D5BE] rounded-xl p-3 focus-visible:ring-1 focus-visible:ring-[#D87A32] font-serif text-sm text-[#3D2E1F] placeholder:text-[#3D2E1F]/30 resize-none"
            />
            <div className="flex justify-between items-center text-[10px] text-[#7A6652]">
              {errors.bio ? (
                <span className="text-[#B85A1F]">{errors.bio}</span>
              ) : (
                <span>旅の目的や好きなこと</span>
              )}
              <span>{bio.length} / 150</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving || uploading}
          className="w-full h-14 rounded-full bg-gradient-to-r from-[#D87A32] to-[#B85A1F] hover:from-[#E88B43] hover:to-[#C96B30] text-white font-bold tracking-widest text-sm shadow-lg shadow-[#D87A32]/25"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            "変更を保存"
          )}
        </Button>
      </div>

      {/* Image Crop Dialog */}
      <Dialog open={isCropping} onOpenChange={setIsCropping}>
        <DialogContent className="sm:max-w-md bg-[#FEF9F3] border-[#E8D5BE] p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-4 border-b border-[#E8D5BE] bg-white/50">
            <DialogTitle className="text-[#3D2E1F] font-serif text-center">画像編集</DialogTitle>
          </DialogHeader>

          <div className="relative w-full h-[300px] bg-[#1a1a1a]">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            )}
          </div>

          <div className="p-4 space-y-4 bg-white/50">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-[#7A6652] font-bold">ズーム</span>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(value) => setZoom(value[0])}
                className="flex-1"
              />
            </div>

            <DialogFooter className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCropping(false);
                  setImageSrc(null);
                }}
                className="flex-1 border-[#E8D5BE] text-[#7A6652] hover:bg-[#FEF9F3]"
              >
                キャンセル
              </Button>
              <Button
                onClick={uploadCroppedImage}
                disabled={uploading}
                className="flex-1 bg-[#3D2E1F] text-white hover:bg-[#2A1F15]"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "完了"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileEdit;
