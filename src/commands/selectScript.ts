import * as vscode from "vscode";
import {
  getAvailableContainers,
  getCommandByCustomConfigurations,
  getPackageJsonScripts,
  getScriptListByCustomConfigurations,
  isCustomScript,
} from "../actions";

export async function selectScript() {
  const containerOption = "Quero apenas usar um container";
  const scriptOption = "Não quero usar um container";
  const packageJsonScripts = getPackageJsonScripts();
  const availableContainers = await getAvailableContainers();
  const customScripts = getScriptListByCustomConfigurations();
  const isDockerRunning = availableContainers.length > 0;

  let selectedContainer = "";

  if (!packageJsonScripts.length && !customScripts.length) {
    vscode.window.showErrorMessage(
      "Não foi possível encontrar scripts no package.json ou nas configurações do projeto."
    );
    return;
  }

  const options = isDockerRunning
    ? packageJsonScripts.concat(customScripts, [containerOption])
    : packageJsonScripts.concat(customScripts);

  const prefixedOptions = options.map((option) => {
    if (customScripts.includes(option)) {
      return `$(gear) ${option}`;
    }

    if (packageJsonScripts.includes(option)) {
      return `$(json) ${option}`;
    }

    return option;
  });

  let selectedScript = await vscode.window.showQuickPick(prefixedOptions, {
    placeHolder: "Selecione um script...",
    title: "Selecione um script para executar",
  });

  if (!selectedScript) {
    vscode.window.showInformationMessage("Seleção cancelada.");
    return;
  }

  if (isDockerRunning) {
    selectedContainer = (await vscode.window.showQuickPick(
      [...availableContainers, scriptOption],
      {
        placeHolder: "Selecione um container Docker para executar o script",
        title: "Selecione um container Docker para executar o script",
      }
    )) as string;

    if (!selectedContainer) {
      vscode.window.showInformationMessage("Seleção cancelada.");
      return;
    }
  }

  selectedScript = selectedScript.replace(/^\$\([a-zA-Z0-9\-_]+\)\s*/, "");

  const isOnlyContainer = selectedScript === containerOption;

  if (isOnlyContainer && selectedContainer === scriptOption) {
    vscode.window.showInformationMessage(
      "Nenhum script ou container selecionado."
    );
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
  if (
    (isCustomScript(selectedScript) && isOnlyScriptWithoutContainer) ||
    (isCustomScript(selectedScript) && !selectedContainer)
  ) {
    const command = getCommandByCustomConfigurations(`${selectedScript}`);
    terminal.sendText(command);
  }

  if (
    isCustomScript(selectedScript) &&
    !isOnlyScriptWithoutContainer &&
    isDockerRunning &&
    selectedContainer
  ) {
    const command = getCommandByCustomConfigurations(`${selectedScript}`);
    terminal.sendText(
      `docker exec -it ${selectedContainer} bash -c "${command} && exec bash"`
    );
  }

  if (isOnlyScriptWithoutContainer && !isCustomScript(selectedScript)) {
    terminal.sendText(`npm run ${selectedScript}`);
  } else if (!isCustomScript(selectedScript)) {
    terminal.sendText(
      `docker exec -it ${selectedContainer} bash -c "npm run ${selectedScript} && exec bash"`
    );
  }

  terminal.show();
}
