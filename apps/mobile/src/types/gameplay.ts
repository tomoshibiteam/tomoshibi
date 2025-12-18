export type GameSpot = {
  id: string;
  orderIndex: number;
  name: string;
  description?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type GameSession = {
  eventId: string;
  questId: string;
  title: string;
  areaName?: string | null;
  description?: string | null;
  spots: GameSpot[];
  progressStep: number; // 1〜spots.length
  isCompleted: boolean;
};
