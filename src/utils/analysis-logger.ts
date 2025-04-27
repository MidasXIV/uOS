import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const homedir = os.homedir();
const ANALYSIS_LOG_DIR = path.join(homedir, 'uOS_logs', 'analysis-logs');

/**
 * Logs the analysis result into a daily JSON file.
 *
 * @param timestamp - The timestamp of the analysis.
 * @param analysis - The analysis result to log.
 */
export function logAnalysisResult(timestamp: string, analysis: object): void {
  // Ensure the log directory exists
  fs.mkdirSync(ANALYSIS_LOG_DIR, { recursive: true });

  // Get the current date in YYYYMMDD format
  const currentDate = timestamp.split('T')[0].replaceAll('-', '');

  console.log(`Logging analysis result for date: ${currentDate}`);
  // Path to the daily log file
  const logFilePath = path.join(ANALYSIS_LOG_DIR, `analysis-${currentDate}.json`);

  // Read the existing log file or initialize a new one
  let logData: Record<string, object> = {};
  if (fs.existsSync(logFilePath)) {
    try {
      const fileContent = fs.readFileSync(logFilePath, 'utf8');
      logData = JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading existing log file:', error);
    }
  }

  // Add the new analysis result under the timestamp
  logData[timestamp] = analysis;

  // Write the updated log data back to the file
  try {
    fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2));
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
}

// returns the last X file paths from the logs directory
export function getLastXAnalysisLogsFilePaths(x: number = 5): string[] {
  const files = fs.readdirSync(ANALYSIS_LOG_DIR).filter(file => file.endsWith('.json'));
  const sortedFiles = files.sort((a, b) => {
    const dateA = new Date(a.split('-')[1].replace('.json', ''));
    const dateB = new Date(b.split('-')[1].replace('.json', ''));
    return dateB.getTime() - dateA.getTime(); // Sort in descending order
  });
  return sortedFiles.slice(0, x).map(file => path.join(ANALYSIS_LOG_DIR, file));
}

