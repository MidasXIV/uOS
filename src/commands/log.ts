import {Command, Flags} from '@oclif/core';
import Sentiment from "sentiment";

import { timeStamp, writeLineToCurrentFile } from '../utils/file';

export default class LogCommand extends Command {
  static description = "Add a new log";

static flags = {
  message: Flags.string({ char: "m", description: "message" }),
  type: Flags.string({ char: "t", description: "type" }),
};

  async run() {
    const time = timeStamp();

    const { flags } = await this.parse(LogCommand);
    const message = flags.message || "null";
    const type = flags.type || "log";

    const sentiment = new Sentiment();
    const sentimentScore = sentiment.analyze(message);

    const composedMessage = `${time} | ${type} | sentiment:${sentimentScore.score} | ${message}`;

    writeLineToCurrentFile(composedMessage, type);
  }
}

