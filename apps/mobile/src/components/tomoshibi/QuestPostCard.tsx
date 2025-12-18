import { User, Clock, MapPin, Heart, Sparkles } from "lucide-react";

interface QuestPostCardProps {
  authorName: string;
  authorAvatar?: string;
  postedAt: string;
  isFollowing?: boolean;
  questTitle: string;
  questImage: string;
  duration: string;
  distance: string;
  difficulty?: "Easy" | "Normal" | "Hard";
  area?: string;
  tags?: string[];
  likes?: number;
}

const QuestPostCard = ({
  authorName,
  authorAvatar,
  postedAt,
  isFollowing = false,
  questTitle,
  questImage,
  duration,
  distance,
  difficulty = "Normal",
  area,
  tags = [],
  likes = 32,
}: QuestPostCardProps) => {
  const difficultyColor = {
    Easy: "text-green-600",
    Normal: "text-primary",
    Hard: "text-destructive",
  };
  const difficultyLabel = {
    Easy: "やさしい",
    Normal: "ふつう",
    Hard: "チャレンジ",
  };

  return (
    <div className="mx-4 bg-white rounded-3xl border border-[#efdcc2] shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#f1e2cf] flex items-center justify-center overflow-hidden border border-[#e7d2b7]">
            {authorAvatar ? (
              <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-[#9b7753]" />
            )}
          </div>
          <div>
            <p className="font-semibold text-[#3d2b1f] text-sm">{authorName}</p>
            <p className="text-xs text-muted-foreground">{postedAt}</p>
          </div>
        </div>
        {!isFollowing && (
          <button className="px-4 py-1.5 bg-tomoshibi-navy text-white text-sm font-semibold rounded-full shadow-sm hover:opacity-90 transition-opacity">
            フォロー
          </button>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3">
        <div className="relative h-40 rounded-2xl overflow-hidden shadow-card mt-3">
          <img src={questImage} alt={questTitle} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
          <div className="absolute top-3 left-3 flex gap-2">
            {area && (
              <span className="px-3 py-1 rounded-full bg-white/85 text-[#3d2b1f] text-xs font-semibold shadow-sm">
                {area}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-[#ffcf9f] text-[#8b4f19] text-[11px] font-bold flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              注目
            </span>
          </div>
        </div>

        <h3 className="font-semibold text-[#3d2b1f] text-lg leading-tight">{questTitle}</h3>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          {tags.map((tag) => (
            <span key={tag} className="px-2 py-1 rounded-full bg-[#f7ecde] text-[#8d6b4e] border border-[#edd4b2]">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between bg-[#f7ecde] border border-[#edd4b2] rounded-2xl px-3 py-2">
          <div className="flex items-center gap-3 text-sm text-[#6e4b2d]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{duration}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{distance}</span>
            </div>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-white border border-[#f3d7b8] ${difficultyColor[difficulty]}`}>
            {difficultyLabel[difficulty]}
          </span>
        </div>

        <div className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
          <Heart className="w-4 h-4" />
          <span className="font-medium">{likes}</span>
        </div>
      </div>
    </div>
  );
};

export default QuestPostCard;
