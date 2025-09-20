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

export interface ScriptHistoryConfig {
  history: ScriptExecution[];
  maxHistorySize: number;
}
