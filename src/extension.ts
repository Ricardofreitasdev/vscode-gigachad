import * as vscode from "vscode";
import statusBar from "./statusBar";
import { COMMAND_SHOW_MENU } from "./constants";
import { selectScript } from "./commands/selectScript";

export function activate(context: vscode.ExtensionContext) {
  const statusBarItem = new statusBar();

  const disposable = vscode.commands.registerCommand(
    COMMAND_SHOW_MENU,
    selectScript
  );
  context.subscriptions.push(statusBarItem, disposable);
}

export function deactivate() {}
