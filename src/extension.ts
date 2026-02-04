import * as vscode from "vscode";
import statusBar from "./statusBar";
import { COMMAND_SHOW_MENU } from "./constants";
import { selectScript } from "./commands/selectScript";
import { ScriptHistoryService } from "./services/ScriptHistoryService";
import { AutoRunService } from "./services/AutoRunService";
import {
  clearAutoRun,
  configureAutoRun,
  runAutoRunIfConfigured,
} from "./commands/autoRun";

export function activate(context: vscode.ExtensionContext) {
  // Inicializar o serviço de histórico
  const historyService = ScriptHistoryService.getInstance();
  historyService.setContext(context);

  const autoRunService = AutoRunService.getInstance();
  autoRunService.setContext(context);
  
  const statusBarItem = new statusBar();
  
  // Comando principal
  const disposableMain = vscode.commands.registerCommand(
    COMMAND_SHOW_MENU,
    selectScript
  );

  const disposableAutoRun = vscode.commands.registerCommand(
    "gigachad.configureAutoRun",
    configureAutoRun
  );

  const disposableClearAutoRun = vscode.commands.registerCommand(
    "gigachad.clearAutoRun",
    clearAutoRun
  );
  
  // Comando para ver histórico
  const disposableHistory = vscode.commands.registerCommand(
    "gigachad.viewHistory",
    async () => {
      const history = await historyService.getRecentHistory(20);
      
      if (history.length === 0) {
        vscode.window.showInformationMessage("Nenhum histórico encontrado.");
        return;
      }
      
      const options = history.map(exec => ({
        label: `${exec.success ? '$(check)' : '$(error)'} ${exec.scriptName}`,
        description: `${formatTimeAgo(exec.timestamp)} - ${exec.scriptType}`,
        value: exec.scriptName
      }));
      
      await vscode.window.showQuickPick(options, {
        placeHolder: "Histórico de execuções...",
        title: "Histórico Completo"
      });
    }
  );
  
  context.subscriptions.push(
    statusBarItem, 
    disposableMain, 
    disposableHistory,
    disposableAutoRun,
    disposableClearAutoRun
  );

  void runAutoRunIfConfigured();
}

export function deactivate() {}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d atrás`;
  if (hours > 0) return `${hours}h atrás`;
  if (minutes > 0) return `${minutes}min atrás`;
  return "agora";
}
