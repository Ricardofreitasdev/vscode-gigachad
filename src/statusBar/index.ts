import * as vscode from "vscode";
import { ScriptHistoryService } from "../services/ScriptHistoryService";

export default class StatusBarItem implements vscode.Disposable {
  private statusBar: vscode.StatusBarItem;
  private historyService: ScriptHistoryService;

  constructor() {
    this.historyService = ScriptHistoryService.getInstance();
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBar.name = "Gigachad";
    this.statusBar.text = "$(terminal) Gigachad";
    this.statusBar.tooltip = "Gigachad está pronto para ajudar!";
    this.statusBar.command = "gigachad.showCommandMenu";
    this.statusBar.accessibilityInformation = {
      label: "GigaChad is ready to help you!",
    };
    
    this.updateStatusBar();
    this.statusBar.show();
  }

  private async updateStatusBar() {
    const recentHistory = await this.historyService.getRecentHistory(1);
    
    let tooltip = "Gigachad está pronto para ajudar!";
    
    if (recentHistory.length > 0) {
      const lastExec = recentHistory[0];
      tooltip += `\nÚltima execução: ${lastExec.scriptName}`;
    }
    
    this.statusBar.tooltip = tooltip;
  }

  public async refresh() {
    await this.updateStatusBar();
  }

  public dispose() {
    this.statusBar.dispose();
  }
}
