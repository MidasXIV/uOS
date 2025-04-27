import * as fs from 'node:fs';
import * as path from 'node:path';

import { IAnalysisResult } from '../../types/analysis';
import { timeStamp, writeLineToCurrentFile } from '../../utils/file';
import { TokenTracker } from '../../utils/token-tracking';


type LogEntry = IAnalysisResult;

export class LogReviewAgent {
  private logsDir: string;
  private tokenTracker: TokenTracker;

  constructor(logsDir: string) {
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

    return summaries.join('\n\n---\n\n');
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

// // -- INITIATOR FUNCTION --

// export async function initiateLogReview(agent: LogReviewAgent, logFileName: string) {
//   try {
//     const summary = await agent.reviewLogFile(logFileName);
//     return `Here's the log review you asked for:\n\n${summary}\n\nAnything you'd like me to prioritize or flag further?`;
//   } catch (error) {
//     return `Couldn’t complete the log review — ${error instanceof Error ? error.message : 'unknown error'}. Standing by for further instructions.`;
//   }
// }
