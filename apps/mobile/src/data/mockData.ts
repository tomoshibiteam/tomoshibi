export interface User {
  id: string;
  name: string;
  email: string;
  rank: string;
  title: string;
  ap: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

export interface Event {
  id: string;
  title: string;
  keyVisualUrl: string;
  location: string;
  difficulty: number;
  description: string;
  status: "Upcoming" | "Active" | "Archived";
}

export interface DailyLog {
  id: string;
  category: string;
  reportText: string;
  submittedAt: string;
}

export const currentUser: User = {
  id: "1",
  name: "蒼月 凛",
  email: "sogetsu@example.com",
  rank: "新米",
  title: "海岸の監視者",
  ap: 285,
};

export const achievements: Achievement[] = [
  {
    id: "1",
    name: "初めての手がかり",
    description: "最初の捜査報告を提出",
    icon: "🔍",
    earned: true,
  },
  {
    id: "2",
    name: "地域の守護者",
    description: "ゴミ拾い活動に10回参加",
    icon: "🛡️",
    earned: true,
  },
  {
    id: "3",
    name: "謎解きマスター",
    description: "3つの依頼を解決",
    icon: "🏆",
    earned: true,
  },
  {
    id: "4",
    name: "継続の力",
    description: "7日連続で捜査報告を提出",
    icon: "⭐",
    earned: false,
  },
  {
    id: "5",
    name: "環境保護チャレンジャー",
    description: "エコな選択を20回記録",
    icon: "🌱",
    earned: false,
  },
  {
    id: "6",
    name: "コミュニティの絆",
    description: "地域イベントに15回参加",
    icon: "🤝",
    earned: false,
  },
];

export const events: Event[] = [
  {
    id: "1",
    title: "消えた虹色のメロディーの秘密",
    keyVisualUrl: "/src/assets/event-rainbow-melody.png",
    location: "大阪二色の浜",
    difficulty: 1,
    description: "未来から届いた一通の不思議な依頼。メロディーの秘密を解き明かせ。",
    status: "Active",
  },
  {
    id: "2",
    title: "Coming Soon...",
    keyVisualUrl: "",
    location: "未定",
    difficulty: 1,
    description: "新しい依頼を準備中です。お楽しみに。",
    status: "Upcoming",
  },
  {
    id: "3",
    title: "Coming Soon...",
    keyVisualUrl: "",
    location: "未定",
    difficulty: 1,
    description: "新しい依頼を準備中です。お楽しみに。",
    status: "Upcoming",
  },
  {
    id: "4",
    title: "Coming Soon...",
    keyVisualUrl: "",
    location: "未定",
    difficulty: 1,
    description: "新しい依頼を準備中です。お楽しみに。",
    status: "Upcoming",
  },
];

export const dailyLogs: DailyLog[] = [
  {
    id: "1",
    category: "ゴミ拾い",
    reportText: "駅前でペットボトル5本を回収しました",
    submittedAt: "2025-10-08",
  },
  {
    id: "2",
    category: "地域イベント",
    reportText: "商店街の清掃活動に参加",
    submittedAt: "2025-10-07",
  },
];
