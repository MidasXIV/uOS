import {Command, Config, Flags} from '@oclif/core';
import fs from 'node:fs';
import os from 'node:os'
import path from 'node:path';

import {ScreenshotUtils} from '../utils/screenshot';

const homedir = os.homedir()
const SCREENSHOT_DIR = path.join(homedir, 'uOS_logs', 'screenshots')
const COLLAGE_DIR = path.join(homedir, 'uOS_logs', 'collages');

export default class Collage extends Command {
  static description = "Create a collage of today's or past screenshots";

  static examples = [
    `$ uos collage`,
    `$ uos collage --date 2025-04-27`,
  ];

  static flags = {
    date: Flags.string({
      char: 'd',
      description: 'Specify a date (YYYY-MM-DD) for the collage',
    }),
  };

  async run() {
    const {flags} = await this.parse(Collage);
    const targetDate = flags.date || this.getCurrentDate();

    console.log(targetDate)
    // Ensure directories exist
    fs.mkdirSync(SCREENSHOT_DIR, {recursive: true});
    fs.mkdirSync(COLLAGE_DIR, {recursive: true});

    await this.createDailyCollage(targetDate);
  }

  private async createDailyCollage(date?: string): Promise<void> {
    try {
      const targetDate = date || this.getCurrentDate()
      const today = this.getCurrentDate()

      // Get all screenshots for the target date
      const targetScreenshots = fs
        .readdirSync(SCREENSHOT_DIR)
        .filter((file) => file.startsWith(`screenshot-${targetDate}`))
        .map((file) => path.join(SCREENSHOT_DIR, file))

        console.log(targetScreenshots);
      if (targetScreenshots.length > 0) {
        // Create collage for the target date
        const collagePath = path.join(COLLAGE_DIR, `collage-${targetDate}.png`)
        await ScreenshotUtils.createImageCollage(targetScreenshots, collagePath)

        this.log(`Collage created for ${targetDate}: ${collagePath}`)
      } else {
        this.log(`No screenshots found for ${targetDate}`)
      }

      // Handle backlog if no specific date is provided
      if (!date) {
        const allDates = fs
          .readdirSync(SCREENSHOT_DIR)
          .map((file) => file.match(/^screenshot-(\d{4}-\d{2}-\d{2})T/)?.[1])
          .filter(Boolean)
          .filter((d) => d && d < today) // Only process past dates
          .filter((d) => !fs.existsSync(path.join(COLLAGE_DIR, `collage-${d}.png`))) // Skip dates with existing collages
        
        const uniqueDates = [...new Set(allDates)]

        console.log(uniqueDates)
        for (const backlogDate of uniqueDates) {
          this.createDailyCollage(backlogDate)
        }
      }
    } catch (error) {
      this.error(`Error creating collage: ${error instanceof Error ? error.message : 'Unknown error occurred'}`)
    }
  }

  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}
