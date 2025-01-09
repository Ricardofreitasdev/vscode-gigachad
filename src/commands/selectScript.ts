import * as vscode from "vscode";
import {
  getAvailableContainers,
  getCommandByCustomConfigurations,
  getPackageJsonScripts,
  getPackageManager,
  getScriptListByCustomConfigurations,
  isCustomScript,
} from "../actions";

const containerOption = "I just want to use a Docker container";
const scriptOption = "I don't want to use a Docker container";
const packageJsonScripts = getPackageJsonScripts();
const customScripts = getScriptListByCustomConfigurations();
const packageMaganer = getPackageManager();

export async function selectScript() {
  const availableContainers = await getAvailableContainers();
  const isDockerRunning = availableContainers.length > 0;
  let selectedContainer = "";

  if (!packageJsonScripts.length && !customScripts.length) {
    vscode.window.showErrorMessage(
      "Could not find scripts in package.json or project configurations."
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
    placeHolder: "Select a script...",
    title: "Select a script to run",
  });

  if (!selectedScript) {
    vscode.window.showInformationMessage("Selection canceled.");
    return;
  }

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

  selectedScript = selectedScript.replace(/^\$\([a-zA-Z0-9\-_]+\)\s*/, "");

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
    return;
  }

  if (
    (isOnlyScriptWithoutContainer && !isCustomScript(selectedScript)) ||
    (!isDockerRunning && selectedScript !== containerOption)
  ) {
    terminal.sendText(`${packageMaganer} run ${selectedScript}`);
  } else if (!isCustomScript(selectedScript)) {
    terminal.sendText(
      `docker exec -it ${selectedContainer} bash -c "${packageMaganer} run ${selectedScript} && exec bash"`
    );
  }

  terminal.show();
}
