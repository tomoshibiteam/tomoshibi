import { Search, Sparkles } from "lucide-react";

interface SearchBarProps {
  points?: number;
}

const SearchBar = ({ points = 120 }: SearchBarProps) => {
  return (
    <div className="relative px-5">
      <div className="absolute right-6 -top-2 flex items-center gap-1.5 bg-[#ffe8d2] text-[#9b5a26] px-3 py-1 rounded-full text-[11px] font-semibold shadow-card border border-[#f3cda1]">
        <Sparkles className="w-3.5 h-3.5" />
        <span className="tracking-tight">ポイント {points}</span>
      </div>

      <div className="flex items-center gap-3 rounded-full bg-[#f7ecde] border border-[#edd4b2] shadow-card px-4 py-3">
        <Search className="w-5 h-5 text-[#c27a34]" />
        <input
          type="text"
          placeholder="クエストやエリアを検索"
          className="w-full bg-transparent text-[15px] placeholder:text-[#b07a4c] text-[#3d2b1f] focus:outline-none"
        />
      </div>
    </div>
  );
};

export default SearchBar;
