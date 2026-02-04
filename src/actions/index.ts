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

function execCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

export async function getAvailableContainers(): Promise<string[]> {
  try {
    const stdout = await execCommand('docker ps --format "{{.Names}}"');
    return stdout.split("\n").filter(Boolean);
  } catch (error) {
    throw new Error(`Erro ao listar containers: ${String(error)}`);
  }
}

type ContainerShell = "bash" | "sh";

function getPreferredContainerShell(): ContainerShell | null {
  const config = vscode.workspace.getConfiguration("gigachad");
  const preferred = config.get<string>("containerShell");
  if (preferred === "bash" || preferred === "sh") {
    return preferred;
  }
  return null;
}

export async function getContainerShell(
  containerName: string
): Promise<ContainerShell> {
  const preferred = getPreferredContainerShell() ?? "bash";

  if (preferred === "sh") {
    return "sh";
  }

  try {
    await execCommand(`docker exec ${containerName} bash -c "exit 0"`);
    return "bash";
  } catch (_error) {
    return "sh";
  }
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
