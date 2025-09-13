import * as vscode from 'vscode';
import { ScriptExecution, FavoriteScript, ScriptHistoryConfig } from '../types/scriptHistory';

export class ScriptHistoryService {
  private static instance: ScriptHistoryService;
  private configKey = 'gigachad.scriptHistory';
  private defaultConfig: ScriptHistoryConfig = {
    favorites: [],
    history: [],
    maxHistorySize: 20,
    maxFavoritesSize: 10
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

    // Adicionar ao histórico
    config.history.unshift(execution);
    
    // Manter apenas os últimos N registros
    config.history = config.history.slice(0, config.maxHistorySize);
    
    // Incrementar contador de uso se for favorito
    const favorite = config.favorites.find(f => 
      f.scriptName === scriptName && 
      f.workspace === workspace
    );
    if (favorite) {
      favorite.usageCount++;
    }

    await this.saveConfig(config);
  }

  // Adicionar/remover favorito
  async toggleFavorite(scriptName: string, scriptType: 'package' | 'custom'): Promise<boolean> {
    const config = await this.getConfig();
    const workspace = this.getCurrentWorkspace();
    
    const existingIndex = config.favorites.findIndex(f => 
      f.scriptName === scriptName && 
      f.workspace === workspace
    );

    if (existingIndex >= 0) {
      // Remover dos favoritos
      config.favorites.splice(existingIndex, 1);
      await this.saveConfig(config);
      return false;
    } else {
      // Adicionar aos favoritos
      if (config.favorites.length >= config.maxFavoritesSize) {
        // Remover o menos usado
        config.favorites.sort((a, b) => a.usageCount - b.usageCount);
        config.favorites.shift();
      }
      
      config.favorites.push({
        scriptName,
        scriptType,
        addedAt: Date.now(),
        usageCount: 0,
        workspace
      });
      
      await this.saveConfig(config);
      return true;
    }
  }

  // Obter scripts favoritos
  async getFavorites(): Promise<FavoriteScript[]> {
    const config = await this.getConfig();
    const workspace = this.getCurrentWorkspace();
    
    return config.favorites
      .filter(f => f.workspace === workspace)
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  // Obter histórico recente
  async getRecentHistory(limit: number = 5): Promise<ScriptExecution[]> {
    const config = await this.getConfig();
    const workspace = this.getCurrentWorkspace();
    
    return config.history
      .filter(h => h.workspace === workspace)
      .slice(0, limit);
  }

  // Verificar se script é favorito
  async isFavorite(scriptName: string): Promise<boolean> {
    const config = await this.getConfig();
    const workspace = this.getCurrentWorkspace();
    
    return config.favorites.some(f => 
      f.scriptName === scriptName && 
      f.workspace === workspace
    );
  }

  // Limpar histórico
  async clearHistory(): Promise<void> {
    const config = await this.getConfig();
    config.history = [];
    await this.saveConfig(config);
  }

  // Limpar favoritos
  async clearFavorites(): Promise<void> {
    const config = await this.getConfig();
    config.favorites = [];
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
