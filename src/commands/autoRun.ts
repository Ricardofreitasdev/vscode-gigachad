import * as vscode from "vscode";
import {
  getAvailableContainers,
  getContainerShell,
  getPackageJsonScripts,
  getPackageManager,
  getScriptListByCustomConfigurations,
} from "../actions";
import {
  CONTAINER_ONLY_OPTION,
  NO_CONTAINER_OPTION,
} from "../constants/options";
import { AutoRunService } from "../services/AutoRunService";
import { ScriptHistoryService } from "../services/ScriptHistoryService";
import { resolveCommand } from "./resolveCommand";

type ScriptOption = {
  label: string;
  value: string;
  scriptType: "package" | "custom";
};

async function safeGetAvailableContainers(): Promise<string[]> {
  try {
    return await getAvailableContainers();
  } catch (_error) {
    return [];
  }
}

export async function configureAutoRun(): Promise<void> {
  const packageScripts = getPackageJsonScripts();
  const customScripts = getScriptListByCustomConfigurations();

  if (!packageScripts.length && !customScripts.length) {
    vscode.window.showErrorMessage(
      "Could not find scripts in package.json or project configurations."
    );
    return;
  }

  const scriptOptions: ScriptOption[] = [
    ...packageScripts.map((name) => ({
      label: `$(json) ${name}`,
      value: name,
      scriptType: "package" as const,
    })),
    ...customScripts.map((name) => ({
      label: `$(gear) ${name}`,
      value: name,
      scriptType: "custom" as const,
    })),
  ];

  const selectedScript = await vscode.window.showQuickPick(scriptOptions, {
    placeHolder: "Selecione o script para auto-run...",
    title: "Configurar Auto-run",
  });

  if (!selectedScript) {
    vscode.window.showInformationMessage("Configuração cancelada.");
    return;
  }

  const availableContainers = await safeGetAvailableContainers();
  const isDockerRunning = availableContainers.length > 0;
  let selectedContainer = NO_CONTAINER_OPTION;

  if (isDockerRunning) {
    const containerChoice = await vscode.window.showQuickPick(
      [NO_CONTAINER_OPTION, ...availableContainers],
      {
        placeHolder: "Selecione o container (opcional)...",
        title: "Configurar Auto-run",
      }
    );

    if (!containerChoice) {
      vscode.window.showInformationMessage("Configuração cancelada.");
      return;
    }

    selectedContainer = containerChoice;
  }

  const autoRunService = AutoRunService.getInstance();
  await autoRunService.setConfigForCurrentWorkspace({
    scriptName: selectedScript.value,
    scriptType: selectedScript.scriptType,
    containerName:
      selectedContainer === NO_CONTAINER_OPTION ? null : selectedContainer,
  });

  const containerLabel =
    selectedContainer === NO_CONTAINER_OPTION
      ? "sem container"
      : `container ${selectedContainer}`;

  vscode.window.showInformationMessage(
    `Auto-run configurado: ${selectedScript.value} (${containerLabel}).`
  );
}

export async function clearAutoRun(): Promise<void> {
  const autoRunService = AutoRunService.getInstance();
  await autoRunService.clearConfigForCurrentWorkspace();
  vscode.window.showInformationMessage("Auto-run desativado neste projeto.");
}

export async function runAutoRunIfConfigured(): Promise<void> {
  const autoRunService = AutoRunService.getInstance();
  const config = await autoRunService.getConfigForCurrentWorkspace();

  if (!config) {
    return;
  }

  const historyService = ScriptHistoryService.getInstance();
  const packageManager = getPackageManager();
  const availableContainers = await safeGetAvailableContainers();
  const isDockerRunning = availableContainers.length > 0;

  const selectedContainer = config.containerName || NO_CONTAINER_OPTION;

  if (config.containerName && !availableContainers.includes(config.containerName)) {
    vscode.window.showWarningMessage(
      `Auto-run configurado com o container "${config.containerName}", mas ele não está disponível.`
    );
    return;
  }

  const selectedScript = config.scriptName;
  const containerShell =
    config.containerName && isDockerRunning
      ? await getContainerShell(config.containerName)
      : "bash";

  const resolved = resolveCommand({
    selectedScript,
    selectedContainer,
    isDockerRunning,
    containerShell,
    packageManager,
    containerOption: CONTAINER_ONLY_OPTION,
    noContainerOption: NO_CONTAINER_OPTION,
  });

  if (!resolved) {
    vscode.window.showWarningMessage("Auto-run não conseguiu resolver o comando.");
    return;
  }

  const terminal = vscode.window.createTerminal({
    name: `🚀 [Gigachad Auto-run]: ${selectedScript}`,
  });

  terminal.sendText(resolved.command);
  terminal.show();

  if (!resolved.isContainerOnly) {
    await historyService.recordExecution(
      selectedScript,
      resolved.scriptType,
      resolved.command,
      true
    );
  }
}
