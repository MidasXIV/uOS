import {Command, Config, Flags} from '@oclif/core'
import dotenv from 'dotenv'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

dotenv.config()

import {ScreenshotAnalysisAgent} from '../lib/agents/screenshot-analysis-agent'
import { logAnalysisResult } from '../utils/analysis-logger';
import {ScreenshotUtils} from '../utils/screenshot'
import {TokenTracker} from '../utils/token-tracking'
import LogCommand from './log'

const homedir = os.homedir()
const SCREENSHOT_DIR = path.join(homedir, 'uOS_logs', 'screenshots')

export default class Analyze extends Command {
  static description = 'Periodically analyze screenshots'

  static examples = [`$ uos analyze --interval 10`]

  static flags = {
    help: Flags.help({char: 'h'}),
    interval: Flags.integer({
      char: 'i',
      default: 5,
      description: 'Analysis interval in minutes',
    }),
    stop: Flags.boolean({
      char: 's',
      default: false,
      description: 'Stop the analysis process',
    }),
  }

  private agent: ScreenshotAnalysisAgent
  private analysisInterval: NodeJS.Timeout | null = null
  private tokenTracker: TokenTracker

  constructor(argv: string[], config: Config) {
    super(argv, config)
    this.agent = new ScreenshotAnalysisAgent()
    this.tokenTracker = TokenTracker.getInstance()
  }

  async run() {
    const {flags} = await this.parse(Analyze)

    // Ensure directories exist
    fs.mkdirSync(SCREENSHOT_DIR, {recursive: true})

    if (flags.stop) {
      this.stopAnalysis()
      return
    }

    // Start periodic analysis
    this.startAnalysis(flags.interval)
  }

  private async analyzeAndCapture(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replaceAll(/[.:]/g, '-')
      const screenshotPath = path.join(SCREENSHOT_DIR, `screenshot-${timestamp}.png`)

      // Capture screenshot using ScreenshotUtils
      await ScreenshotUtils.captureScreenshot(screenshotPath)

      // Analyze the screenshot
      const imageContent = fs.readFileSync(screenshotPath)
      const analysis = await this.agent.analyzeScreenshot(
        'Analyze current screen activity',
        imageContent.toString('base64'),
      )

      // Log the analysis
      this.log(`\nAnalysis at ${new Date().toLocaleTimeString()}: Status: ${analysis.status} | ${analysis.summary}`)
      LogCommand.run([`-m Status: ${analysis.status} | ${analysis.summary}`,'-t ss-analysis'])

      // Log token usage
      const usage = this.tokenTracker.getTokenUsage(
        'screenshot-analysis',
        process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      )
      if (usage) {
        this.log(`\nToken Usage Today: ${usage.days[this.getCurrentDate()] || 0}`)
        this.log(`Total Token Usage: ${usage.total}`)
      }

      // Log the analysis result into a daily JSON file
      logAnalysisResult(timestamp, analysis);
    } catch (error) {
      this.error(`Error during analysis: ${error instanceof Error ? error.message : 'Unknown error occurred'}`)
    }
  }

  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0].replaceAll('-', '')
  }

  private startAnalysis(interval: number): void {
    this.log(`Starting periodic analysis every ${interval} minutes...`)
    this.log('Press Ctrl+C to stop')

    // Run immediately on start
    this.analyzeAndCapture()

    // Then run every interval minutes
    this.analysisInterval = setInterval(() => {
      this.analyzeAndCapture()
    }, interval * 60 * 1000)
  }

  private stopAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval)
      this.analysisInterval = null
      this.log('Analysis stopped')
    } else {
      this.log('No analysis process running')
    }
  }
}
