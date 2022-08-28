export type BotMethodRequest = string;

export type BotMethodResponse = {
  output?: string;
  controls?: Record<
    string,
    (botMethodResponse: BotMethodResponse) => Promise<string>
  >;
  nextCommand?: string;
};

export const BOT_RESULT_OK = 'OK';
export const BOT_RESULT_BACK = '..';
export const BOT_RESULT_NEXT = 'NEXT';

export function getCommandNames<T>(command: T) {
  return Object.getOwnPropertyNames(command.constructor.prototype).filter(
    (m) => m !== 'constructor'
  );
}

export function createNextCommand<T>(command: T, commandName: keyof T) {
  const commandNames = getCommandNames(command);
  if (commandNames.findIndex((v) => v === commandName) !== -1) {
    return `${BOT_RESULT_NEXT}__${String(commandName)}`;
  }
  throw new Error(`Command name "${String(commandName)}" not found`);
}

export function getCommandIndexByName<T>(command: T, commandName: keyof T) {
  const commandNames = getCommandNames(command);
  return commandNames.findIndex((v) => v === commandName);
}

export function getNextCommandIndexByRequest<T>(command: T, request: string) {
  const commandNames = getCommandNames(command);
  return commandNames.findIndex(
    (commandName) => request === `${BOT_RESULT_NEXT}__${commandName}`
  );
}

export class BotState<T> {
  private state: Partial<Record<keyof T, string>> = {};

  public getState(commandName: keyof T, defaultValue: string) {
    return (
      Object.getOwnPropertyDescriptor(this.state, commandName)?.value ||
      defaultValue
    );
  }

  public setState(commandName: keyof T, value: string) {
    this.state[commandName] = value;
  }
}

export enum BotControlsType {
  'Radiogroup' = 'Radiogroup',
  'Input' = 'Input',
  'Alert' = 'Alert',
}

export class BotControls {
  isAlert(botMethodResponse: BotMethodResponse): boolean {
    return Boolean(
      Object.keys(botMethodResponse.controls || {}).find(
        (key) => key === BotControlsType.Alert
      )
    );
  }
  createAlert(): BotMethodResponse['controls'] {
    return {
      [BotControlsType.Alert]: (botMethodResponse: BotMethodResponse) => {
        alert(botMethodResponse.output);
        return Promise.resolve('');
      },
    };
  }
  isInput(botMethodResponse: BotMethodResponse): boolean {
    return Boolean(
      Object.keys(botMethodResponse.controls || {}).find(
        (key) => key === BotControlsType.Input
      )
    );
  }
  createInput(defaultValue: string): BotMethodResponse['controls'] {
    return {
      [BotControlsType.Input]: (botMethodResponse: BotMethodResponse) =>
        Promise.resolve(prompt(botMethodResponse.output, defaultValue)),
    };
  }
  isRadiogroup(botMethodResponse: BotMethodResponse): boolean {
    return Boolean(
      Object.keys(botMethodResponse.controls || {}).find(
        (key) => key === BotControlsType.Radiogroup
      )
    );
  }
  createRadiogroup(
    defaultValue: string,
    options: {
      keys: string[];
    }
  ): BotMethodResponse['controls'] {
    return {
      [BotControlsType.Radiogroup]: (botMethodResponse: BotMethodResponse) =>
        Promise.resolve(
          prompt(
            `${botMethodResponse.output} (${options.keys.join(', ')})`,
            defaultValue
          )
        ),
    };
  }
}

export class BotCommandRunner<T> {
  constructor(
    private readonly state: BotState<T>,
    private readonly command: T,
    private readonly botControls: BotControls
  ) {}

  async run() {
    const commandNames = getCommandNames(this.command);
    let i = 0;
    while (i < commandNames.length) {
      const commandName = commandNames[i];
      if (!commandName) {
        return;
      }
      let exit = false;
      let botMethodResponse: BotMethodResponse = this.command[commandName]();

      const flow = (
        botMethodResponse: BotMethodResponse,
        promptResult: string
      ) => {
        if (promptResult !== BOT_RESULT_BACK) {
          botMethodResponse = this.command[commandName](promptResult);
          const gotoIndex = getNextCommandIndexByRequest(
            this.command,
            botMethodResponse.nextCommand
          );
          if (gotoIndex !== -1) {
            i = gotoIndex;
          } else {
            i++;
          }
        } else {
          i--;
        }
      };

      const botControlsType = Object.keys(BotControlsType || {});
      const controlNames = Object.keys(botMethodResponse.controls || {});
      for (
        let controlNameIndex = 0;
        controlNameIndex < controlNames.length;
        controlNameIndex++
      ) {
        const controlName = controlNames[controlNameIndex];
        for (
          let controlTypeIndex = 0;
          controlTypeIndex < botControlsType.length;
          controlTypeIndex++
        ) {
          if (
            !exit &&
            botMethodResponse.output !== undefined &&
            this.botControls[`is${controlName}`] &&
            this.botControls[`is${controlName}`](botMethodResponse)
          ) {
            const promptResult = await botMethodResponse.controls[controlName](
              botMethodResponse
            );
            flow(botMethodResponse, promptResult);
            exit = true;
          }
        }
      }
    }
  }
}
