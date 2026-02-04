import * as vscode from "vscode";

export type AutoRunConfig = {
  scriptName: string;
  scriptType: "package" | "custom";
  containerName: string | null;
};

type AutoRunState = {
  byWorkspace: Record<string, AutoRunConfig>;
};

export class AutoRunService {
  private static instance: AutoRunService;
  private configKey = "gigachad.autoRun";
  private defaultState: AutoRunState = {
    byWorkspace: {},
  };
  private context: vscode.ExtensionContext | null = null;

  private constructor() {}

  static getInstance(): AutoRunService {
    if (!AutoRunService.instance) {
      AutoRunService.instance = new AutoRunService();
    }
    return AutoRunService.instance;
  }

  public setContext(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async getConfigForCurrentWorkspace(): Promise<AutoRunConfig | null> {
    const state = await this.getState();
    const workspaceId = this.getCurrentWorkspaceId();
    return state.byWorkspace[workspaceId] || null;
  }

  async setConfigForCurrentWorkspace(config: AutoRunConfig): Promise<void> {
    const state = await this.getState();
    const workspaceId = this.getCurrentWorkspaceId();
    state.byWorkspace[workspaceId] = config;
    await this.saveState(state);
  }

  async clearConfigForCurrentWorkspace(): Promise<void> {
    const state = await this.getState();
    const workspaceId = this.getCurrentWorkspaceId();
    delete state.byWorkspace[workspaceId];
    await this.saveState(state);
  }

  private async getState(): Promise<AutoRunState> {
    if (!this.context) {
      return { ...this.defaultState };
    }

    const saved = this.context.globalState.get<AutoRunState>(this.configKey);
    return saved ? { ...this.defaultState, ...saved } : { ...this.defaultState };
  }

  private async saveState(state: AutoRunState): Promise<void> {
    if (this.context) {
      await this.context.globalState.update(this.configKey, state);
    }
  }

  private getCurrentWorkspaceId(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    return workspaceFolders && workspaceFolders.length > 0
      ? workspaceFolders[0].uri.fsPath
      : "global";
  }
}
