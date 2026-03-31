export enum WasteCategory {
  RECYCLABLE = 'Recyclable',
  NON_RECYCLABLE = 'Non-recyclable',
  MEDICAL = 'Medical Waste',
  E_WASTE = 'E-Waste',
  ORGANIC = 'Organic Waste',
  HAZARDOUS = 'Hazardous Waste',
  GENERAL = 'General Waste',
}

export interface ClassificationItem {
  name: string;
  category: WasteCategory;
  confidence: number;
  disposalInstructions: string;
  ecoTip: string;
}

export type Region = 'USA' | 'Germany' | 'Japan' | 'India';
export type Language = 'en' | 'de' | 'ja' | 'hi' | 'ta' | 'te' | 'zh' | 'es' | 'fr' | 'ar' | 'pt' | 'ru' | 'ur' | 'kn' | 'ml';

export interface RegionConfig {
  name: string;
  languages: Language[];
  binColors: { [key in WasteCategory]?: string };
}

// Gamification Types
export interface UserStats {
  totalScore: number;
  totalClassified: number;
  categoriesClassified: { [key in WasteCategory]?: number };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  check: (stats: UserStats) => boolean;
}

export interface LeaderboardEntry {
    name: string;
    score: number;
}
