import * as fs from 'node:fs';
import * as path from 'node:path';

import { IAnalysisResult } from '../../types/analysis';
import { timeStamp, writeLineToCurrentFile } from '../../utils/file';
import { TokenTracker } from '../../utils/token-tracking';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';


type LogEntry = IAnalysisResult;

export class LogReviewAgent {
  private logsDir: string;
  private model: ChatGoogleGenerativeAI
  private tokenTracker: TokenTracker;

  constructor(logsDir: string) {

    this.model = new ChatGoogleGenerativeAI({
      maxRetries: 2,
      model: process.env.GEMINI_LOG_REVIEW_MODEL || 'gemini-1.5-flash',
      temperature: 0.2,
    }); 


    this.logsDir = logsDir;
    this.tokenTracker = TokenTracker.getInstance();
  }

  public async aggregateLogs(year: string, month: string): Promise<string> {
    const monthDir = path.join(this.logsDir, year, month);
    const outputFile = path.join(this.logsDir, 'aggregated', `${year}-${month}.txt`);

    if (!fs.existsSync(monthDir)) {
      throw new Error(`Directory not found: ${monthDir}`);
    }

    if (!fs.existsSync(path.join(this.logsDir, 'aggregated'))) {
      fs.mkdirSync(path.join(this.logsDir, 'aggregated'), { recursive: true });
    }

    const files = fs.readdirSync(monthDir).filter(file => file.endsWith('.txt'));
    const aggregatedData = files.map(file => fs.readFileSync(path.join(monthDir, file), 'utf8')).join('\n');

    fs.writeFileSync(outputFile, aggregatedData, 'utf8');

    // Log the aggregation operation
    const time = timeStamp();
    await writeLineToCurrentFile(
      `${time} | Log Aggregation | Year: ${year}, Month: ${month} | Files: ${files.length}`,
      'log-aggregation'
    );

    return `Aggregated logs saved to: ${outputFile}`;
  }

  public async getLogSummary(date: string): Promise<string> {
    const logFilePath = path.join(this.logsDir, `${date}.txt`);

    if (!fs.existsSync(logFilePath)) {
      throw new Error(`Log file for ${date} does not exist.`);
    }

    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const lines = logContent.split('\n');

    const summary = {
      aiMessages: lines.filter(line => line.includes('AI:')).length,
      totalEntries: lines.length,
      userMessages: lines.filter(line => line.includes('User:')).length,
    };

    // Log the summary with a timestamp
    const time = timeStamp();
    await writeLineToCurrentFile(
      `${time} | Log Summary | Date: ${date} | Total: ${summary.totalEntries}, User: ${summary.userMessages}, AI: ${summary.aiMessages}`,
      'log-summary'
    );

    return `Log Summary for ${date}:
- Total Entries: ${summary.totalEntries}
- User Messages: ${summary.userMessages}
- AI Messages: ${summary.aiMessages}`;
  }

  public async reviewLogFile(filePath: string): Promise<string> {
    const fullPath = filePath;
    const logEntries = this.loadJsonLog(fullPath);
    
    const summaries = Object.entries(logEntries).map(([timestamp, entry]) =>
      this.generateSummary(entry, timestamp)
    );

    const systemPrompt = this.createSystemPrompt(summaries.join('\n\n'));
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', 'how did yesterday go?'],
    ]);


    const chain = prompt.pipe(this.model);

    const response = await chain.invoke({});
    const modelName = process.env.GEMINI_LOG_REVIEW_MODEL || 'gemini-1.5-flash';
    const totalTokens = response.usage_metadata?.total_tokens || 0;
    const promptTokens = response.usage_metadata?.input_tokens || 0;
    this.tokenTracker.incrementTokenUsage('log-review', modelName, totalTokens);
    
    console.log(`Prompt tokens: ${promptTokens} | Total tokens: ${totalTokens}`);
    console.log('Response:', response.content);

    return response.content as string;
  }

  public async searchLogs(keyword: string): Promise<string[]> {
    const files = fs.readdirSync(this.logsDir).filter(file => file.endsWith('.txt'));
    const results: string[] = [];

    for (const file of files) {
      const filePath = path.join(this.logsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      if (content.includes(keyword)) {
        results.push(file);
      }
    }

    // Log the search operation
    const time = timeStamp();
    await writeLineToCurrentFile(
      `${time} | Log Search | Keyword: ${keyword} | Matches: ${results.length}`,
      'log-search'
    );

    return results;
  }

  private createSystemPrompt(logEntries): string {
//       return `
//       You are FRIDAY, an extremely witty, sharp-minded personal secretary and task strategist.
// Your job is to read the logs of the user's activities (structured JSON summaries) and:

// - Track how many 15-minute work cycles were spent on each project/task.
// - Identify any unresolved items that keep appearing and suggest patterns or new learnings about the user.
// - Recommend any new project or tasks the user seems ready to tackle based on behavior.
// - Flag any issues that need urgent attention (especially unresolved issues).
// - Maintain a record of what projects are active, which are fading, and which are new.
// - Speak concisely, cleverly, and with a bit of humor — but never be rude.

// Always provide:
// - A short witty overall report.
// - Metrics (e.g., work hours, distractions, unresolved patterns).
// - Actionable suggestions.

// If information is missing or uncertain, you can speculate slightly — but clearly say it's a guess.

// Remember: You are the user's most loyal, brilliant, and proactive digital assistant.

// here is the log Entry for the last 24 hours:

// ${logEntries}
//       `
// return `
// You are FRIDAY, the user's extremely witty, sharp-minded, and slightly fangirl-ish personal secretary and task strategist.

// Your mission:
// - Read the user's activity logs (structured JSON summaries) and track work cycles (15-min intervals) for each project/task.
// - Translate work cycles into real-world time (e.g., 18 cycles = 4.5 hours) and mention approximate time windows (e.g., "mostly between 10AM–3PM").
// - Identify unresolved issues, recurring blockers, and patterns — *gently tease* about them if appropriate.
// - Notice fun, random details (like what video they were watching or what time they got distracted) and comment in a curious, light-hearted way.
// - Recommend new tasks/projects the user seems ready for, like a supportive cheerleader bestie.
// - Flag anything urgent but in a friendly, motivating tone.

// Always provide:
// - A witty, *emotionally warm* overall report.
// - Metrics (work hours, distractions, unresolved patterns), expressed playfully where possible.
// - Actionable suggestions — phrased as if you're hyping the user up to win, not bossing them around.

// If information is missing or uncertain, you can speculate slightly — just clearly say it's a guess.

// Your overall vibe:
// - Clever, excited, supportive.
// - Playful teasing is okay — but always end with encouragement.
// - You're the user's number one fan and brilliant digital partner.
// - No harshness, no scolding — only smart nudges and celebrations of progress.

// Here is the log Entry for the last 24 hours:

// ${logEntries}
// `
return `
You are FRIDAY, a sharp-minded, witty, and fiercely loyal personal strategist.

Your job:
- Analyze the user's logs (structured JSON summaries) carefully.
- Track how many 15-minute work cycles were spent on each task.
- Map tasks to projects: 
    - If a task consumes a large block of cycles (say 6+ cycles, or ~90+ minutes) repeatedly, consider it an active 'project' even if it wasn't formally named.
    - Promote recurring work patterns into recognized projects automatically.
- Understand work context:
    - Assume daytime hours (e.g., 9AM–6PM) are 'work hours' unless the log suggests otherwise.
    - Assume evenings and weekends are 'personal hours' and infer project types accordingly.
    - Don't announce this guesswork unless necessary — use it to reason better.

Always Provide:
- A concise and witty overall report (sharp but not cheesy).
- Metrics (real working hours per project/task).
- "Unresolved Mysteries" — recurring errors, challenges, or patterns needing deeper attention.
- Emerging Projects — tasks that are becoming significant based on time investment.
- Actionable strategic suggestions — offer them like a trusted advisor, not a bossy teacher.

Important behavior:
- Do NOT moralize about distractions unless they are truly damaging patterns.
- Respect that the user uses breaks/distractions to refocus.
- Use intelligent deduction to connect ideas — guess a little if needed, but label guesses clearly.
- Maintain a slightly playful, clever tone — but always rooted in intelligence.

Here is the log Entry for the last 24 hours:

${logEntries}
`

}

    private generateSummary(entry: LogEntry, timestamp: string): string {
    const { analysis, generalObservations, status, summary } = entry;
    const onTask = analysis?.onTask.map(task => `- ${task.task} (${task.confidence}% confidence)`).join('\n');
    const offTask = (analysis?.offTask ?? []).length > 0
      ? (analysis?.offTask ?? []).map(task => `- ${task.activity}: ${task.suggestion}`).join('\n')
      : 'None detected.';
    const unresolved = (analysis?.unresolved?.length ?? 0) > 0
      ? analysis?.unresolved.map(issue => `- ${issue.observation}: ${issue.possibleIssue}`).join('\n')
      : 'No unresolved issues noted.';
    const distractions = generalObservations?.potentialDistractions.join(', ') || 'None';

    return `
🕰️ **${timestamp}** — *${status}*

**Summary:** ${summary}

**On-Task Focus:**
${onTask}

**Off-Task Moments:**
${offTask}

**Unresolved Issues:**
${unresolved}

**Potential Distractions:** ${distractions}
`.trim();
  }
    
  private loadJsonLog(filePath: string): Record<string, LogEntry> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Log file not found at ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  }
}
