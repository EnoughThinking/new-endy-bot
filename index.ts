import {
  BotCommandRunner,
  BotControls,
  BotMethodRequest,
  BotMethodResponse,
  BotState,
  BOT_RESULT_BACK,
  BOT_RESULT_OK,
  createNextCommand,
} from './bot-lib';

enum FirstMeetingGenderType {
  Male = 'Male',
  Female = 'Female',
}

class FirstMeetingCommand {
  constructor(
    private readonly state: BotState<FirstMeetingCommand>,
    private readonly controls: BotControls
  ) {}

  public askFirstname(botMethodRequest?: BotMethodRequest): BotMethodResponse {
    if (!botMethodRequest) {
      return {
        output: 'Tell me you name',
        controls: this.controls.createInput(
          this.state.getState('askFirstname', '')
        ),
      };
    }
    this.state.setState('askFirstname', botMethodRequest);
    return {
      output: `Hello ${botMethodRequest}`,
      // nextCommand: createNextCommand(this, 'askGender'),
    };
  }

  public askLastname(botMethodRequest?: BotMethodRequest): BotMethodResponse {
    if (!botMethodRequest) {
      return {
        output: `Tell me you last name ("${BOT_RESULT_BACK}" - move to back)`,
        controls: this.controls.createInput(
          this.state.getState('askLastname', '')
        ),
      };
    }
    this.state.setState('askLastname', botMethodRequest);
    return {};
  }

  public askGender(botMethodRequest?: BotMethodRequest): BotMethodResponse {
    if (!botMethodRequest) {
      return {
        output: `Tell me you gender ("${BOT_RESULT_BACK}" - move to back)`,
        controls: {
          ...this.controls.createRadiogroup(
            this.state.getState('askGender', ''),
            { keys: Object.keys(FirstMeetingGenderType) }
          ),
          ...this.controls.createInput(this.state.getState('askGender', '')),
        },
      };
    }
    this.state.setState('askGender', botMethodRequest);
    return {};
  }

  public endMeeting(botMethodRequest?: BotMethodRequest): BotMethodResponse {
    if (!botMethodRequest) {
      this.state.setState('endMeeting', BOT_RESULT_OK);
      return {
        output: `Hello ${
          this.state.getState('askGender', 'Sir') ===
          FirstMeetingGenderType.Female
            ? 'Madam'
            : 'Sir'
        }. ${this.state.getState(
          'askFirstname',
          'unknown'
        )} ${this.state.getState('askLastname', 'unknown')}`,
        controls: this.controls.createAlert(),
      };
    }
    return {};
  }
}

const state = new BotState<FirstMeetingCommand>();
const controls = new BotControls();
const command = new FirstMeetingCommand(state, controls);
const botCommandRunner = new BotCommandRunner(state, command, controls);
botCommandRunner.run();
