import { Heart, Sparkles, Compass, Map, Building2 } from "lucide-react";

interface LevelUpCardProps {
  userName?: string;
  rankName?: string;
  likes?: number;
  avatarUrl?: string;
}

const LevelUpCard = ({
  userName = "teresa_jenkins",
  rankName = "エクスプローラー",
  likes = 24,
  avatarUrl,
}: LevelUpCardProps) => {
  return (
    <div className="mx-4 bg-white border border-[#efdcc2] rounded-3xl shadow-elevated overflow-hidden">
      <div className="relative h-52 bg-gradient-to-br from-[#ffe5a3] via-[#ffb96a] to-[#d6783a] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <div className="absolute top-6 left-8 w-16 h-16 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-4 right-10 w-24 h-24 rounded-full bg-[#fff3d4]/60 blur-3xl" />
          <div className="absolute inset-6 border border-white/20 rounded-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 text-white drop-shadow-md">
            <Building2 className="w-10 h-10" />
            <div className="w-[72px] h-[72px] rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/40 p-4">
              <Compass className="w-10 h-10" />
            </div>
            <Map className="w-10 h-10" />
          </div>
          <div className="px-6 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-white" />
            <span className="text-white font-bold text-lg tracking-wide">{rankName}</span>
          </div>
          <p className="text-white/90 text-xs font-medium">TOMOSHIBI ランクアップ</p>
        </div>
      </div>

      <div className="p-5 text-center space-y-3">
        <p className="text-[#3d2b1f]">
          <span className="font-semibold">{userName}</span>
          <span className="text-muted-foreground"> さんが </span>
          <span className="font-semibold text-primary">{rankName}</span>
          <span className="text-muted-foreground"> にランクアップしました</span>
        </p>

        <div className="flex justify-center">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fff4e3] border border-[#f3d7b8] text-[#b0652f] text-sm font-semibold shadow-card hover:shadow-elevated transition-shadow">
            <Heart className="w-4 h-4" />
            <span>{likes}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LevelUpCard;
