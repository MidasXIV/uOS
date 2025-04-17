import { Args, Command, Flags } from '@oclif/core';
import * as dotenv from 'dotenv'
import fs from 'node:fs';
import path from 'node:path';

import { readProjectsFile } from '../utils/file';
import { formatProjectsForAnalysis, getProjectSummary } from '../utils/project-parsing';
dotenv.config()

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

    console.log(args, flags);
    try {
      const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
      const { ChatPromptTemplate } = await import('@langchain/core/prompts');
      const { StringOutputParser } = await import('@langchain/core/output_parsers');

      // Get current projects and format them
      const projects = await readProjectsFile();
      const projectSummary = getProjectSummary(projects);
      const formattedProjects = formatProjectsForAnalysis(projects);

      // Initialize the Gemini model
      const model = new ChatGoogleGenerativeAI({
        maxOutputTokens: 2048,
        maxRetries: 2,
        model: 'gemini-2.0-flash',
        temperature: 0,
      });

      // Create the system prompt
      const systemPrompt = `You are a task monitoring assistant. I will send you a screenshot of my screen, and you need to analyze if I'm working on any of my active projects or tasks.

${projectSummary}

For each analysis, provide:
1. Status: ["On Task", "Off Task", "Unclear"]
2. If On Task:
   - Which project and task you think I'm working on
   - Confidence level (0-100%)
   - Estimated time spent on this task (based on screen content)
3. If Off Task:
   - What you think I'm doing instead
   - Suggestion for getting back on track
4. General observations:
   - Any patterns in my work habits
   - Suggestions for improvement
   - Potential distractions

Current active projects and tasks:
${formattedProjects}`;

      // Create a prompt template
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', systemPrompt],
        ['human', '{input}'],
      ]);

      // Create a chain
      const chain = prompt.pipe(model).pipe(new StringOutputParser());

      // Prepare the input
      let input: { image: string; text: string } | string = args.query;

      if (flags.image) {
        const imagePath = path.resolve(flags.image);
        if (!fs.existsSync(imagePath)) {
          throw new Error(`Image file not found: ${imagePath}`);
        }

        const imageBase64 = fs.readFileSync(imagePath, 'base64');
        input = {
          image: imageBase64,
          text: args.query
        };
      }

      console.log(systemPrompt);
      // Execute the chain
      const response = await chain.invoke({ input });

      this.log(response);
    } catch (error) {
      this.error(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  }
}
