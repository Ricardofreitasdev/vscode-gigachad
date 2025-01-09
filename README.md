# Gigachad

This is a VSCode extension that provides useful functionalities for developers. The extension automates and streamlines the execution of scripts, package manager detection, and Docker integration, all directly within your development environment.

## Features

- **Detects Package Manager:** Identifies whether the project uses `npm` or `yarn` to run scripts.
- **Script Execution:** Allows running scripts defined in the `package.json` with the correct package manager.
- **Docker Integration:** Supports executing commands inside Docker containers.
- **Dynamic Commands:** Adapts commands based on context (for example, executing via `docker exec` or directly in the terminal).

### Example of Custom Configuration:

In the VSCode configuration file (`settings.json`), add the custom scripts you want to execute. Here is an example:

```json
"gigachad.customScripts": [
  {
    "name": "Project",
    "command": "./vendor/bin/sail up -d"
  },
  {
    "name": "Project - Test PHP",
    "command": "php artisan test"
  },
  {
    "name": "Project - Setup",
    "command": "test",
    "group": "example-app"
  }
]
```

Here’s the table in Markdown format explaining the JSON configuration in English:

markdown
Copiar código

### Explanation of the JSON Configuration

| Field     | Description                                                                                                 | Example                                           |
| --------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `name`    | The name of the custom script that will appear in the VSCode interface.                                     | `"Project"`, `"Project - Test PHP"`               |
| `command` | The command to be executed in the terminal when the script is triggered. It can be any valid shell command. | `"./vendor/bin/sail up -d"`, `"php artisan test"` |
| `group`   | (Optional) The group to which the script belongs. This helps in organizing scripts into categories.         | `"example-app"`                                   |
