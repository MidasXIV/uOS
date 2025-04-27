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
