import { Args, Command, Config, Flags, ux } from "@oclif/core";
import fs from "node:fs";
import os from 'node:os'
import path from 'node:path'
import readEachLineSync from "read-each-line-sync";

import { LogReviewAgent } from "../lib/agents/log-review-agent";
import { getLastXAnalysisLogsFilePaths } from "../utils/analysis-logger";
import { getLastXFilePaths } from "../utils/file";

const homedir = os.homedir()
const ANALYSIS_LOG_DIR = path.join(homedir, 'uOS_logs', 'analysis-logs')

export default class ReviewCommand extends Command {
  static args = {
    timespan: Args.string({
      default: "day",
      description: "Specify a timespan",
      name: "timespan",
      options: ["day", "week", "month"],
      required: false,
      type: "string",
    }),
  };

  static description = "Ai summary of screenshot analysis logs";

  static flags = {  };

    private agent: LogReviewAgent

    constructor(argv: string[], config: Config) {
      super(argv, config)
      this.agent = new LogReviewAgent(ANALYSIS_LOG_DIR)
    }

  public async run() {
    const { args, flags } = await this.parse(ReviewCommand);

    const last5Files = getLastXAnalysisLogsFilePaths(5);
    const latestLogFilePath = last5Files[0];


    console.log(last5Files);

    const analysis = this.agent.reviewLogFile(latestLogFilePath);
    console.log(analysis);
    

    // ux.table(
    //   logs,
    //   {
    //     message: {
    //       minWidth: 20,
    //     },
    //     metaData: {
    //       extended: true,
    //     },
    //     time: {
    //       minWidth: 7,
    //     },
    //     type: {},
    //   },
    //   {
    //     ...flags,
    //   }
    // );
  }
}
