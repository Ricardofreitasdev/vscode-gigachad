import * as vscode from 'vscode';
import { ScriptExecution, ScriptHistoryConfig } from '../types/scriptHistory';

export class ScriptHistoryService {
  private static instance: ScriptHistoryService;
  private configKey = 'gigachad.scriptHistory';
  private defaultConfig: ScriptHistoryConfig = {
    history: [],
    maxHistorySize: 20
  };
  private context: vscode.ExtensionContext | null = null;

  private constructor() {}

  static getInstance(): ScriptHistoryService {
    if (!ScriptHistoryService.instance) {
      ScriptHistoryService.instance = new ScriptHistoryService();
    }
    return ScriptHistoryService.instance;
  }

  public setContext(context: vscode.ExtensionContext) {
    this.context = context;
  }

  // Salvar execução no histórico
  async recordExecution(
    scriptName: string, 
    scriptType: 'package' | 'custom', 
    command: string, 
    success: boolean,
    duration?: number
  ): Promise<void> {
    const config = await this.getConfig();
    const workspace = this.getCurrentWorkspace();
    
    // Verificar se já existe uma entrada para este script no histórico
    const existingIndex = config.history.findIndex(h => 
      h.scriptName === scriptName && 
      h.workspace === workspace
    );

    const execution: ScriptExecution = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      scriptName,
      scriptType,
      command,
      timestamp: Date.now(),
      success,
      duration,
      workspace
    };

    if (existingIndex >= 0) {
      // Atualizar entrada existente
      config.history[existingIndex] = execution;
    } else {
      // Adicionar nova entrada no início
      config.history.unshift(execution);
    }
    
    // Manter apenas os últimos N registros
    config.history = config.history.slice(0, config.maxHistorySize);

    await this.saveConfig(config);
  }

  // Obter histórico recente
  async getRecentHistory(limit: number = 5): Promise<ScriptExecution[]> {
    const config = await this.getConfig();
    const workspace = this.getCurrentWorkspace();
    
    return config.history
      .filter(h => h.workspace === workspace)
      .slice(0, limit);
  }

  // Limpar histórico
  async clearHistory(): Promise<void> {
    const config = await this.getConfig();
    config.history = [];
    await this.saveConfig(config);
  }

  private async getConfig(): Promise<ScriptHistoryConfig> {
    if (!this.context) {
      return { ...this.defaultConfig };
    }

    const saved = this.context.globalState.get<ScriptHistoryConfig>(this.configKey);
    return saved ? { ...this.defaultConfig, ...saved } : { ...this.defaultConfig };
  }

  private async saveConfig(config: ScriptHistoryConfig): Promise<void> {
    if (this.context) {
      await this.context.globalState.update(this.configKey, config);
    }
  }

  private getCurrentWorkspace(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    return workspaceFolders && workspaceFolders.length > 0 
      ? workspaceFolders[0].name 
      : 'global';
  }
}
