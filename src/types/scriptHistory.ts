export interface ScriptExecution {
  id: string;
  scriptName: string;
  scriptType: 'package' | 'custom';
  command: string;
  timestamp: number;
  success: boolean;
  duration?: number;
  workspace: string;
}

export interface FavoriteScript {
  scriptName: string;
  scriptType: 'package' | 'custom';
  addedAt: number;
  usageCount: number;
  workspace: string;
}

export interface ScriptHistoryConfig {
  favorites: FavoriteScript[];
  history: ScriptExecution[];
  maxHistorySize: number;
  maxFavoritesSize: number;
}
