import * as vscode from "vscode";
import {
  getAvailableContainers,
  getContainerShell,
  getCommandByCustomConfigurations,
  getPackageJsonScripts,
  getPackageManager,
  getScriptListByCustomConfigurations,
  isCustomScript,
} from "../actions";
import {
  CONTAINER_ONLY_OPTION,
  NO_CONTAINER_OPTION,
} from "../constants/options";
import { resolveCommand } from "./resolveCommand";
import { ScriptHistoryService } from "../services/ScriptHistoryService";
import { AutoRunService } from "../services/AutoRunService";
import { clearAutoRun, configureAutoRun } from "./autoRun";

const containerOption = CONTAINER_ONLY_OPTION;
const scriptOption = NO_CONTAINER_OPTION;
const packageJsonScripts = getPackageJsonScripts();
const customScripts = getScriptListByCustomConfigurations();
const packageMaganer = getPackageManager();

interface ScriptOption {
  label: string;
  description?: string;
  value: string;
  isRecent?: boolean;
  scriptType?: 'package' | 'custom';
}

export async function selectScript() {
  const historyService = ScriptHistoryService.getInstance();
  const startTime = Date.now();
  
  const availableContainers = await getAvailableContainers();
  const isDockerRunning = availableContainers.length > 0;
  let selectedContainer = "";
  let containerShell: "bash" | "sh" = "bash";

  if (!packageJsonScripts.length && !customScripts.length) {
    vscode.window.showErrorMessage(
      "Could not find scripts in package.json or project configurations."
    );
    return;
  }

  // Obter histórico recente
  const recentHistory = await historyService.getRecentHistory();

  // Construir opções com histórico recente no topo
  const recentOptions: ScriptOption[] = recentHistory.map(exec => ({
    label: `$(history) ${exec.scriptName}`,
    description: `Executado ${formatTimeAgo(exec.timestamp)}`,
    value: exec.scriptName,
    isRecent: true,
    scriptType: exec.scriptType
  }));

  const options = isDockerRunning
    ? packageJsonScripts.concat(customScripts, [containerOption])
    : packageJsonScripts.concat(customScripts);

  const regularOptions: ScriptOption[] = options.map((option) => {
    const isCustom = customScripts.includes(option);
    const isPackage = packageJsonScripts.includes(option);
    
    return {
      label: isCustom ? `$(gear) ${option}` : 
             isPackage ? `$(json) ${option}` : option,
      value: option,
      isRecent: false,
      scriptType: isCustom ? 'custom' : 'package'
    };
  });

  // Combinar todas as opções (histórico primeiro)
  const allOptions = [
    ...recentOptions,
    ...regularOptions.filter(regular => 
      !recentHistory.some(recent => recent.scriptName === regular.value)
    )
  ];

  // Adicionar opções de contexto
  const autoRunService = AutoRunService.getInstance();
  const autoRunConfig = await autoRunService.getConfigForCurrentWorkspace();

  const contextOptions: ScriptOption[] = [
    { label: '$(history) Ver Histórico Completo', value: 'view-history' },
    { label: '$(trash) Limpar Histórico', value: 'clear-history' },
    {
      label: '$(play) Configurar Auto-run',
      value: 'configure-auto-run',
    },
    ...(autoRunConfig
      ? [
          {
            label: `$(debug-stop) Desativar Auto-run (${autoRunConfig.scriptName})`,
            value: 'clear-auto-run',
          },
        ]
      : []),
  ];

  const finalOptions = [
    ...allOptions,
    { label: '---', value: 'separator' },
    ...contextOptions
  ];

  const selectedItem = await vscode.window.showQuickPick(finalOptions, {
    placeHolder: "Selecione um script...",
    title: "Gigachad Scripts Runner",
    matchOnDescription: true
  });

  if (!selectedItem) {
    vscode.window.showInformationMessage("Seleção cancelada.");
    return;
  }

  // Lidar com opções de contexto
  if (selectedItem.value === 'view-history') {
    await viewFullHistory();
    return;
  }
  
  if (selectedItem.value === 'clear-history') {
    await clearHistory();
    return;
  }

  if (selectedItem.value === 'configure-auto-run') {
    await configureAutoRun();
    return;
  }

  if (selectedItem.value === 'clear-auto-run') {
    await clearAutoRun();
    return;
  }

  // Determinar o tipo do script
  const scriptType: 'package' | 'custom' = selectedItem.scriptType || 
    (isCustomScript(selectedItem.value) ? 'custom' : 'package');

  // Docker container selection
  if (isDockerRunning) {
    selectedContainer = (await vscode.window.showQuickPick(
      [...availableContainers, scriptOption],
      {
        placeHolder: "Select a Docker container to run the script",
        title: "Select a Docker container to run the script",
      }
    )) as string;

    if (!selectedContainer) {
      vscode.window.showInformationMessage("Selection canceled.");
      return;
    }

    if (selectedContainer !== scriptOption) {
      containerShell = await getContainerShell(selectedContainer);
    }
  }

  // Executar script
  const selectedScript = selectedItem.value;
  const duration = Date.now() - startTime;
  
  try {
    const resolved = resolveCommand({
      selectedScript,
      selectedContainer,
      isDockerRunning,
      containerShell,
      packageManager: packageMaganer,
      containerOption,
      noContainerOption: scriptOption,
    });

    if (!resolved) {
      vscode.window.showErrorMessage("Não foi possível resolver o comando.");
      return;
    }

    const action = await vscode.window.showQuickPick(
      ["Executar", "Copiar comando", "Cancelar"],
      {
        placeHolder: "O que você quer fazer?",
        title: "Gigachad Scripts Runner",
      }
    );

    if (!action || action === "Cancelar") {
      vscode.window.showInformationMessage("Ação cancelada.");
      return;
    }

    if (action === "Copiar comando") {
      await vscode.env.clipboard.writeText(resolved.command);
      vscode.window.showInformationMessage("Comando copiado!");
      return;
    }

    const terminal = vscode.window.createTerminal({
      name: `🚀 [Gigachad]: ${
        resolved.isContainerOnly ? selectedContainer : selectedScript
      }`,
    });

    terminal.sendText(resolved.command);
    terminal.show();

    if (!resolved.isContainerOnly) {
      await historyService.recordExecution(
        selectedScript,
        resolved.scriptType,
        resolved.command,
        true,
        duration
      );
    }
    
  } catch (error) {
    // Registrar execução com erro
    await historyService.recordExecution(
      selectedScript,
      scriptType,
      getCommandByCustomConfigurations(selectedScript) || `${packageMaganer} run ${selectedScript}`,
      false,
      duration
    );
    throw error;
  }
}

// Funções auxiliares
async function viewFullHistory() {
  const historyService = ScriptHistoryService.getInstance();
  const history = await historyService.getRecentHistory(20);
  
  if (history.length === 0) {
    vscode.window.showInformationMessage("Nenhum histórico encontrado.");
    return;
  }

  const options = history.map(exec => ({
    label: `${exec.success ? '$(check)' : '$(error)'} ${exec.scriptName}`,
    description: `${formatTimeAgo(exec.timestamp)} - ${exec.duration ? `${exec.duration}ms` : ''}`,
    value: exec.scriptName
  }));

  const selected = await vscode.window.showQuickPick(options, {
    placeHolder: "Histórico de execuções...",
    title: "Histórico Completo"
  });

  if (selected) {
    // Re-executar script selecionado
    await selectScript();
  }
}

async function clearHistory() {
  const result = await vscode.window.showWarningMessage(
    "Tem certeza que deseja limpar todo o histórico?",
    "Sim", "Não"
  );
  
  if (result === "Sim") {
    const historyService = ScriptHistoryService.getInstance();
    await historyService.clearHistory();
    vscode.window.showInformationMessage("Histórico limpo!");
  }
}

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
