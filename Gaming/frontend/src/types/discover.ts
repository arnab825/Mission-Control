export interface DiscoverItem {
  id: string;
  title: string;
  developer?: string;
  publisher?: string;
  release_date?: string;
  primary_genre?: string;
  genres: string[];
  tags: string[];
  rating?: number;
  cover_url?: string;
  banner_url?: string;
  summary?: string;
  store?: string;
  store_app_id?: string;
  launchers: string[];
  in_catalog: boolean;
  ai_classified: boolean;
  installations: Array<{ nodeId: string; nodeName: string; status: string }>;
}

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  description: string;
  source: string;
  category: string;
  pubDate: string;
  imageUrl?: string | null;
}

export interface DiscoverGamesModalProps {
  onClose: () => void;
  onGameAdded?: () => void;
}

export type TabType = 'trending' | 'toprated' | 'news' | 'action' | 'openworld' | 'shooter';
