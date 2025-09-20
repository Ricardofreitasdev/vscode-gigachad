import * as vscode from "vscode";
import {
  getAvailableContainers,
  getCommandByCustomConfigurations,
  getPackageJsonScripts,
  getPackageManager,
  getScriptListByCustomConfigurations,
  isCustomScript,
} from "../actions";
import { ScriptHistoryService } from "../services/ScriptHistoryService";

const containerOption = "I just want to use a Docker container";
const scriptOption = "I don't want to use a Docker container";
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
  const contextOptions: ScriptOption[] = [
    { label: '$(history) Ver Histórico Completo', value: 'view-history' },
    { label: '$(trash) Limpar Histórico', value: 'clear-history' }
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
  }

  // Executar script
  const selectedScript = selectedItem.value;
  const duration = Date.now() - startTime;
  
  try {
    const isOnlyContainer = selectedScript === containerOption;

    if (isOnlyContainer && selectedContainer === scriptOption) {
      vscode.window.showInformationMessage("No script or container selected.");
      return;
    }

    const terminal = vscode.window.createTerminal({
      name: `🚀 [Gigachad]: ${
        isOnlyContainer ? selectedContainer : selectedScript
      }`,
    });

    if (isOnlyContainer && selectedContainer) {
      terminal.sendText(`docker exec -it ${selectedContainer} bash`);
      terminal.show();
      return;
    }

    const isOnlyScriptWithoutContainer = selectedContainer === scriptOption;
    const isCustomScriptWithoutContainer =
      isCustomScript(selectedScript) &&
      (isOnlyScriptWithoutContainer || !selectedContainer);

    if (isCustomScriptWithoutContainer) {
      const command = getCommandByCustomConfigurations(`${selectedScript}`);
      terminal.sendText(command);
      terminal.show();
      
      // Registrar execução bem-sucedida
      await historyService.recordExecution(
        selectedScript,
        scriptType,
        command,
        true,
        duration
      );
      return;
    }

    const isCustomScriptWithDocker =
      isCustomScript(selectedScript) &&
      !isOnlyScriptWithoutContainer &&
      isDockerRunning &&
      selectedContainer;

    if (isCustomScriptWithDocker) {
      const command = getCommandByCustomConfigurations(`${selectedScript}`);
      terminal.sendText(
        `docker exec -it ${selectedContainer} bash -c "${command} && exec bash"`
      );
      terminal.show();
      
      // Registrar execução bem-sucedida
      await historyService.recordExecution(
        selectedScript,
        scriptType,
        command,
        true,
        duration
      );
      return;
    }

    if (
      (isOnlyScriptWithoutContainer && !isCustomScript(selectedScript)) ||
      (!isDockerRunning && selectedScript !== containerOption)
    ) {
      const command = `${packageMaganer} run ${selectedScript}`;
      terminal.sendText(command);
      
      // Registrar execução bem-sucedida
      await historyService.recordExecution(
        selectedScript,
        scriptType,
        command,
        true,
        duration
      );
    } else if (!isCustomScript(selectedScript)) {
      const command = `docker exec -it ${selectedContainer} bash -c "${packageMaganer} run ${selectedScript} && exec bash"`;
      terminal.sendText(command);
      
      // Registrar execução bem-sucedida
      await historyService.recordExecution(
        selectedScript,
        scriptType,
        command,
        true,
        duration
      );
    }

    terminal.show();
    
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
