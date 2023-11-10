import { Args, Command, Flags, ux } from "@oclif/core";
const fs = require("node:fs");
const fileAccessor = require("../utils/file");
const readEachLineSync = require("read-each-line-sync");

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

  static description = "A summary of your logs";

  static flags = {
    columns: Flags.string({
      description: "only show provided columns (comma-seperated)",
      exclusive: ["additional"],
    }),
    csv: Flags.boolean({
      description: "output is csv format",
      exclusive: ["no-truncate"],
    }),
    extended: Flags.boolean({ char: "x", description: "show extra columns" }),
    filter: Flags.string({
      description: "filter property by partial string matching, ex: name=foo",
    }),
    "no-header": Flags.boolean({
      description: "hide table header from output",
      exclusive: ["csv"],
    }),
    "no-truncate": Flags.boolean({
      description: "do not truncate output to fit screen",
      exclusive: ["csv"],
    }),
    sort: Flags.string({
      description: `property to sort by (prepend ' - ' for descending)`,
    }),
  };

  public async run() {
    const { args, flags } = await this.parse(ReviewCommand);

    const timeUnits = {
      day: 1,
      month: 30,
      week: 7,
    };

    const timeUnit = timeUnits[args.timespan];
    const filePaths = fileAccessor.getLastXFilePaths(timeUnit);

    const types: any[] = [];
    const moods: any[] = [];
    const logs: {
      message: any;
      metaData: any;
      time: any;
      type: any;
    }[] = [];

    // Each file == each day
    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        continue;
      }

      readEachLineSync(filePath, (line) => {
        const a = line.split("|");
        const time = a[0].trim();
        const type = a[1] ? a[1].trim() : "log";

        const metaString = a[2] ? a[2].trim() : a[2];
        const metaStringList = metaString ? metaString.split(",") : [];
        const metaData: any[] = [];

        const message = a[3] ? a[3].trim() : a[3];

        for (const meta of metaStringList) {
          const metaVars = meta.split(":");
          metaData[metaVars[0]] = metaVars[1];
        }

        isNaN(types[type]) ? (types[type] = 1) : (types[type] += 1);

        if (type == "mood") {
          isNaN(moods[message]) ? (moods[message] = 1) : (moods[message] += 1);
        }

        const log = {
          message,
          metaData,
          time,
          type,
        };

        logs.push(log);
      });
    }

    console.log("Summary of all logs");
    console.table(types);
    console.log("Mood(s) in timespan");
    console.table(moods);

    ux.table(
      logs,
      {
        message: {
          minWidth: 20,
        },
        metaData: {
          extended: true,
        },
        time: {
          minWidth: 7,
        },
        type: {},
      },
      {
        ...flags,
      }
    );
  }
}
