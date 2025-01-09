import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { exec } from "child_process";

interface CustomScriptConfiguration {
  name: string;
  command: string;
  group?: string;
}

export function getConfigurations() {
  const config = vscode.workspace.getConfiguration("gigachad");
  return config.get<any[]>("customScripts");
}

export function getScriptListByCustomConfigurations() {
  const workspace = getWorkspaceFolder();
  const configurations = getConfigurations();

  const filterAndMap = (
    configurations: CustomScriptConfiguration[] | undefined
  ): string[] => configurations?.map((item) => item.name) || [];

  if (workspace) {
    return filterAndMap(
      configurations?.filter(
        (item) =>
          !item.group || item.group?.toLowerCase() === workspace.toLowerCase()
      )
    );
  }

  return filterAndMap(configurations);
}

export function getCommandByCustomConfigurations(name: string) {
  const configurations = getConfigurations();
  const configuration = configurations?.find((item) => item.name === name);
  return configuration?.command || "";
}

export function isCustomScript(name: string | undefined): boolean {
  return name ? getScriptListByCustomConfigurations().includes(name) : false;
}

export function getPackageJsonScripts() {
  const workspaceFolder = vscode.workspace.workspaceFolders
    ? vscode.workspace.workspaceFolders[0].uri.fsPath
    : "";

  if (!workspaceFolder) {
    return [];
  }

  const packageJsonPath = path.join(workspaceFolder, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    return [];
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return packageJson.scripts ? Object.keys(packageJson.scripts) : [];
}

export async function getAvailableContainers(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    exec('docker ps --format "{{.Names}}"', (error, stdout, stderr) => {
      if (error) {
        reject(`Erro ao listar containers: ${stderr}`);
      }
      const containers = stdout.split("\n").filter(Boolean);
      resolve(containers);
    });
  });
}

export function getWorkspaceFolder() {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (workspaceFolders && workspaceFolders.length > 0) {
    return workspaceFolders[0].name;
  } else {
    return null;
  }
}

export function getPackageManager(): string {
  const projectPath = vscode.workspace.workspaceFolders
    ? vscode.workspace.workspaceFolders[0].uri.fsPath
    : "";

  if (fs.existsSync(path.join(projectPath, "yarn.lock"))) {
    return "yarn";
  }
  if (fs.existsSync(path.join(projectPath, "package-lock.json"))) {
    return "npm";
  }
  return "npm";
}
