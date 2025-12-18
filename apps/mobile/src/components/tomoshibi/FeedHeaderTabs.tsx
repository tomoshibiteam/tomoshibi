import { useState } from "react";

type TabType = "explore" | "forYou";

interface FeedHeaderTabsProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

const FeedHeaderTabs = ({ activeTab = "forYou", onTabChange }: FeedHeaderTabsProps) => {
  const [currentTab, setCurrentTab] = useState<TabType>(activeTab);

  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  const tabClass = (tab: TabType) =>
    `px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
      currentTab === tab
        ? "bg-[#ff8b3d] text-white border-[#ff8b3d] shadow-card"
        : "text-[#3d2b1f] border-[#e4caa7] hover:bg-white/70"
    }`;

  return (
    <div className="flex items-center justify-between px-5">
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground tracking-wide">今日のおすすめ</p>
        <h2 className="text-xl font-semibold text-[#3d2b1f]">あなたのフィード</h2>
      </div>

      <div className="flex items-center gap-1.5 p-1 bg-white/70 border border-[#e4caa7] rounded-full shadow-card">
        <button onClick={() => handleTabChange("explore")} className={tabClass("explore")}>
          探す
        </button>
        <button onClick={() => handleTabChange("forYou")} className={tabClass("forYou")}>
          あなた向け
        </button>
      </div>
    </div>
  );
};

export default FeedHeaderTabs;
