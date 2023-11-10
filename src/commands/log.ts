import {Command, Flags} from '@oclif/core';

const Sentiment = require("sentiment");
const fileAccessor = require("../utils/file");

class LogCommand extends Command {
  static description = "Add a new log";

static flags = {
  message: Flags.string({ char: "m", description: "message" }),
  type: Flags.string({ char: "t", description: "type" }),
};

  async run() {
    const time = fileAccessor.timeStamp();

    const { flags } = await this.parse(LogCommand);
    const message = flags.message || "null";
    const type = flags.type || "log";

    const sentiment = new Sentiment();
    const sentimentScore = sentiment.analyze(message);

    const composedMessage = `${time} | ${type} | sentiment:${sentimentScore.score} | ${message}`;

    fileAccessor.writeLineToCurrentFile(composedMessage, type);
  }
}

module.exports = LogCommand;
