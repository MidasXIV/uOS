import {Command} from '@oclif/core';
import inquirer from "inquirer";

import { getCurrentFilePath, timeStamp, writeLineToCurrentFile } from '../utils/file';

export default class MoodCommand extends Command {
  static description = "";

  async run() {
    const filePath = getCurrentFilePath();

    const responses = await inquirer.prompt([
      {
        choices: [
          "Happy/Aliveness",
          "Despair/Sad",
          "Accepting/Content",
          "Angry/Annoyed",
          "Connected/Loving",
          "Courageous/Powerful",
          "Curious",
          "Disconnected/Numb",
          "Embarrased/Shame",
          "Fear",
          "Fragile",
          "Grateful",
          "Guilt",
          "Hopeful",
          "Powerless",
          "Stressed/Tense",
          "Tender/Reflective",
          "Unsettled/Doubt",
        ],
        message: "Name the feeling? (Pick the first you relate to atm)",
        name: "mood",
        type: "list",
      },
      {
        message: "What caused this feeling?",
        name: "what",
        type: "input",
      },
      {
        message: "Behaviors or actions this feeling caused me to take?",
        name: "actions",
        type: "input",
      },
      {
        message: "Is this feeling appropriate to the situation?",
        name: "isAppropriate",
        type: "input",
      },
      {
        message:
          "What can I do to improve/fix it? (Remember to be kind to yourself)",
        name: "fix",
        type: "input",
      },
    ]);

    const time = timeStamp();
    const meta = `what:${responses.what}, actions:${responses.actions}, isAppropriate:${responses.isAppropriate}, fix:${responses.fix}`;
    const line = `${time} | mood | ${meta} | ${responses.mood}`;

    writeLineToCurrentFile(line);
  }
}

