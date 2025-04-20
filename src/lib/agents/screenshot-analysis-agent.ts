import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import * as dotenv from 'dotenv';

dotenv.config();

import LogCommand from '../../commands/log';
import { AnalysisStatus, IAnalysisResult } from '../../types/analysis';
import { IProject } from '../../types/project';
import { readProjectsFile } from '../../utils/file';
import { formatProjectsForAnalysis, getProjectSummary } from '../../utils/project-parsing';
import { TokenTracker } from '../../utils/token-tracking';

export class ScreenshotAnalysisAgent {
  private model: ChatGoogleGenerativeAI;
  private projects: IProject[] = [];
  private tokenTracker: TokenTracker;

  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      maxOutputTokens: 2048,
      maxRetries: 2,
      model: process.env.GEMINI_SCREENSHOT_ANALYSIS_MODEL || 'gemini-1.5-flash',
      temperature: 0.7,
    });
    this.tokenTracker = TokenTracker.getInstance();
  }

  public async analyzeScreenshot(query: string, imagePath: string): Promise<IAnalysisResult> {
    await this.initializeProjects();

    // Create the system prompt
    const systemPrompt = this.createSystemPrompt();

    // Create a prompt template
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', '{input}'],
    ]);

    // Create a chain
    const chain = prompt.pipe(this.model).pipe(new StringOutputParser());

    // Prepare the input
    const imageBase64 = Buffer.from(imagePath).toString('base64');
    const input = {
      image: imageBase64,
      text: query
    };

    // Execute the chain
    const response = await chain.invoke({ input });

    // Track token usage using actual counts from metadata
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const totalTokens = Math.ceil((response.length + query.length + imageBase64.length) / 4);
    this.tokenTracker.incrementTokenUsage('screenshot', modelName, totalTokens);

    // Log the response
    await LogCommand.run([`-m ${response}`, `-t gemini-reflection`]);

    // Parse the response into structured data
    const analysisResult = this.parseResponse(response);

    return analysisResult;
  }

  private createSystemPrompt(): string {
    const projectSummary = getProjectSummary(this.projects);
    const formattedProjects = formatProjectsForAnalysis(this.projects);

    return `You are a task monitoring assistant. I will send you a screenshot of my screen, and you need to analyze if I'm working on any of my active projects or tasks.

${projectSummary}

For each analysis, provide:
1. Status: ["On Task", "Off Task", "Unclear", "Unresolved"]
   - Use "Unresolved" when you notice something unusual or have important observations
   - This could be working on a new project not in the list
   - Or working on code that looks different from known projects
   - Or any other significant observations that need attention

2. If On Task:
   - Which project and task you think I'm working on
   - Confidence level (0-100%)
   - Estimated time spent on this task (based on screen content)

3. If Off Task:
   - What you think I'm doing instead
   - Suggestion for getting back on track

4. If Unresolved:
   - Describe what you're seeing that's unusual
   - Note any new projects or codebases
   - Highlight any potential issues or opportunities

5. General observations:
   - Any patterns in my work habits
   - Suggestions for improvement
   - Potential distractions
   - Unresolved issues that need attention

Current active projects and tasks:
${formattedProjects}

Please format your response in a way that can be easily parsed into structured data.`;
  }

  private async initializeProjects(): Promise<void> {
    this.projects = await readProjectsFile();
  }

  private parseResponse(response: string): IAnalysisResult {
    // This is a simplified parser - in a real implementation, you'd want to use
    // a more robust parsing strategy, possibly using regex or a proper parser
    const lines = response.split('\n');
    const result: IAnalysisResult = {
      observations: {
        distractions: [],
        patterns: [],
        suggestions: [],
        unresolvedIssues: []
      },
      rawResponse: response,
      status: 'Unclear'
    };

    // Simple parsing logic - this should be enhanced based on your needs
    for (const line of lines) {
      if (line.includes('Status:')) {
        const statusMatch = line.match(/Status:\s*"([^"]+)"/);
        if (statusMatch) {
          result.status = statusMatch[1] as AnalysisStatus;
        }
      }
      // Add more parsing logic here for other fields
    }

    return result;
  }
}
