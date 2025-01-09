import * as vscode from "vscode";

export default class StatusBarItem implements vscode.Disposable {
  private statusBar: vscode.StatusBarItem;

  constructor() {
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBar.name = "Gigachad";
    this.statusBar.text = "$(terminal) Gigachad";
    this.statusBar.tooltip = "Gigachad is ready to help you!";
    this.statusBar.command = "gigachad.showCommandMenu";
    this.statusBar.accessibilityInformation = {
      label: "GigaChad is ready to help you!",
    };
    this.statusBar.show();
  }

  public dispose() {
    this.statusBar.dispose();
  }
}
