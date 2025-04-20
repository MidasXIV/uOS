import { Command, Config, Flags } from '@oclif/core';
import dotenv from 'dotenv';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

dotenv.config();

import { ScreenshotAnalysisAgent } from '../lib/agents/screenshot-analysis-agent';
import { ScreenshotUtils } from '../utils/screenshot';
import { TokenTracker } from '../utils/token-tracking';

const homedir = os.homedir();
const SCREENSHOT_DIR = path.join(homedir, 'uOS_logs', 'screenshots');
const COLLAGE_DIR = path.join(homedir, 'uOS_logs', 'collages');

export default class Analyze extends Command {
  static description = 'Periodically analyze screenshots and create daily collages';

  static examples = [
    `$ uos analyze --interval 10`,
  ];

  static flags = {
    createCollage: Flags.boolean({
      char: 'c',
      default: false,
      description: 'Create a collage of today\'s screenshots',
    }),
    help: Flags.help({ char: 'h' }),
    interval: Flags.integer({
      char: 'i',
      default: 10,
      description: 'Analysis interval in minutes',
    }),
    stop: Flags.boolean({
      char: 's',
      default: false,
      description: 'Stop the analysis process',
    }),
  };

  private agent: ScreenshotAnalysisAgent;
  private analysisInterval: NodeJS.Timeout | null = null;
  private tokenTracker: TokenTracker;

  constructor(argv: string[], config: Config) {
    super(argv, config);
    this.agent = new ScreenshotAnalysisAgent();
    this.tokenTracker = TokenTracker.getInstance();
  }

  async run() {
    const { flags } = await this.parse(Analyze);

    // Ensure directories exist
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    fs.mkdirSync(COLLAGE_DIR, { recursive: true });

    if (flags.stop) {
      this.stopAnalysis();
      return;
    }

    if (flags.createCollage) {
      await this.createDailyCollage();
      return;
    }

    // Start periodic analysis
    this.startAnalysis(flags.interval);
  }

  private async analyzeAndCapture(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replaceAll(/[.:]/g, '-');
      const screenshotPath = path.join(SCREENSHOT_DIR, `screenshot-${timestamp}.png`);

      // Capture screenshot using ScreenshotUtils
      await ScreenshotUtils.captureScreenshot(screenshotPath);

      // Analyze the screenshot
      const imageContent = fs.readFileSync(screenshotPath);
      const analysis = await this.agent.analyzeScreenshot(
        'Analyze current screen activity',
        imageContent.toString('base64')
      );

      // Log the analysis
      this.log(`\nAnalysis at ${new Date().toLocaleTimeString()}:`);
      this.log(`Status: ${analysis.status}`);

      if (analysis.observations.unresolvedIssues?.length) {
        this.log('\nUnresolved Issues:');
        for (const issue of analysis.observations.unresolvedIssues) {
          this.log(`- ${issue}`);
        }
      }

      // Log token usage
      const usage = this.tokenTracker.getTokenUsage('screenshot-analysis', process.env.GEMINI_MODEL || 'gemini-1.5-flash');
      if (usage) {
        this.log(`\nToken Usage Today: ${usage.days[this.getCurrentDate()] || 0}`);
        this.log(`Total Token Usage: ${usage.total}`);
      }

    } catch (error) {
      this.error(`Error during analysis: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }

  private async createDailyCollage(): Promise<void> {
    try {
      const today = this.getCurrentDate();
      const todayScreenshots = fs.readdirSync(SCREENSHOT_DIR)
        .filter(file => file.startsWith(`screenshot-${today}`))
        .map(file => path.join(SCREENSHOT_DIR, file));

      if (todayScreenshots.length === 0) {
        this.log('No screenshots found for today');
        return;
      }

      // Create collage using ScreenshotUtils
      const collagePath = path.join(COLLAGE_DIR, `collage-${today}.png`);
      await ScreenshotUtils.createImageCollage(todayScreenshots, collagePath);

      this.log(`Collage created: ${collagePath}`);

    } catch (error) {
      this.error(`Error creating collage: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }

  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0].replaceAll('-', '');
  }

  private startAnalysis(interval: number): void {
    this.log(`Starting periodic analysis every ${interval} minutes...`);
    this.log('Press Ctrl+C to stop');

    // Run immediately on start
    this.analyzeAndCapture();

    // Then run every interval minutes
    this.analysisInterval = setInterval(() => {
      this.analyzeAndCapture();
    }, interval * 60 * 1000);
  }

  private stopAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
      this.log('Analysis stopped');
    } else {
      this.log('No analysis process running');
    }
  }
}
