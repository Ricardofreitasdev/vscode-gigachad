import {
  getCommandByCustomConfigurations,
  isCustomScript,
} from "../actions";

export type ResolvedCommand = {
  command: string;
  scriptType: "package" | "custom";
  isContainerOnly: boolean;
};

type ResolveCommandInput = {
  selectedScript: string;
  selectedContainer: string;
  isDockerRunning: boolean;
  containerShell: "bash" | "sh";
  packageManager: string;
  containerOption: string;
  noContainerOption: string;
};

export function resolveCommand(
  input: ResolveCommandInput
): ResolvedCommand | null {
  const isOnlyContainer = input.selectedScript === input.containerOption;

  if (isOnlyContainer && input.selectedContainer === input.noContainerOption) {
    return null;
  }

  const isOnlyScriptWithoutContainer =
    input.selectedContainer === input.noContainerOption;
  const isCustom = isCustomScript(input.selectedScript);
  const scriptType: "package" | "custom" = isCustom ? "custom" : "package";

  let command = "";

  if (isOnlyContainer && input.selectedContainer) {
    command = `docker exec -it ${input.selectedContainer} ${input.containerShell}`;
  } else if (isCustom && (isOnlyScriptWithoutContainer || !input.selectedContainer)) {
    command = getCommandByCustomConfigurations(`${input.selectedScript}`);
  } else if (
    isCustom &&
    !isOnlyScriptWithoutContainer &&
    input.isDockerRunning &&
    input.selectedContainer
  ) {
    const customCommand = getCommandByCustomConfigurations(
      `${input.selectedScript}`
    );
    command = `docker exec -it ${input.selectedContainer} ${input.containerShell} -c "${customCommand} && exec ${input.containerShell}"`;
  } else if (
    (isOnlyScriptWithoutContainer && !isCustom) ||
    (!input.isDockerRunning && input.selectedScript !== input.containerOption)
  ) {
    command = `${input.packageManager} run ${input.selectedScript}`;
  } else if (!isCustom) {
    command = `docker exec -it ${input.selectedContainer} ${input.containerShell} -c "${input.packageManager} run ${input.selectedScript} && exec ${input.containerShell}"`;
  }

  if (!command) {
    return null;
  }

  return {
    command,
    scriptType,
    isContainerOnly: isOnlyContainer,
  };
}
