import { Args, Command, Flags } from '@oclif/core';
import * as dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

import { ScreenshotAnalysisAgent } from '../lib/agents/screenshot-analysis-agent';

dotenv.config();

export default class Gemini extends Command {
  static args = {
    query: Args.string({
      description: 'The query to send to Gemini',
      required: true,
    }),
  };

  static description = 'Interact with Google Gemini AI for task monitoring';

  static examples = [
    `$ uos gemini "Analyze my screen" --image "Capture.PNG"`,
  ];

  static flags = {
    help: Flags.help({ char: 'h' }),
    image: Flags.string({
      char: 'i',
      description: 'Path to the image file to analyze',
      required: true,
    })
  };

  async run() {
    const { args, flags } = await this.parse(Gemini);

    try {
      const imagePath = path.resolve(flags.image);
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      const imageContent = fs.readFileSync(imagePath);
      const agent = new ScreenshotAnalysisAgent();
      const analysis = await agent.analyzeScreenshot(args.query, imageContent.toString('base64'));

      // Display the analysis results
      this.log('\nAnalysis Results:');
      this.log(`Status: ${analysis.status}`);

      if (analysis.project) {
        this.log(`\nProject: ${analysis.project.name}`);
        if (analysis.project.task) {
          this.log(`Task: ${analysis.project.task}`);
        }

        this.log(`Confidence: ${analysis.project.confidence}%`);
      }

      if (analysis.timeSpent) {
        this.log(`\nTime Spent: ${analysis.timeSpent.hours}h ${analysis.timeSpent.minutes}m`);
      }

      if (analysis.observations.currentActivity) {
        this.log(`\nCurrent Activity: ${analysis.observations.currentActivity}`);
      }

      if (analysis.observations.suggestions?.length) {
        this.log('\nSuggestions:');
        for (const suggestion of analysis.observations.suggestions) this.log(`- ${suggestion}`);
      }

      if (analysis.observations.unresolvedIssues?.length) {
        this.log('\nUnresolved Issues:');
        for (const issue of analysis.observations.unresolvedIssues) this.log(`- ${issue}`);
      }

      if (analysis.observations.patterns?.length) {
        this.log('\nWork Patterns:');
        for (const pattern of analysis.observations.patterns) this.log(`- ${pattern}`);
      }

      if (analysis.observations.distractions?.length) {
        this.log('\nPotential Distractions:');
        for (const distraction of analysis.observations.distractions) this.log(`- ${distraction}`);
      }

    } catch (error) {
      this.error(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }
}
