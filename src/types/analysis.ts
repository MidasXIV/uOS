export type AnalysisStatus = 'On Task' | 'Off Task' | 'Unclear' | 'Unresolved';

export interface IAnalysisResult {
  status: AnalysisStatus;
  project?: {
    name: string;
    task?: string;
    confidence: number;
  };
  timeSpent?: {
    hours: number;
    minutes: number;
  };
  observations: {
    currentActivity?: string;
    suggestions?: string[];
    patterns?: string[];
    distractions?: string[];
    unresolvedIssues?: string[];
  };
  rawResponse: string;
}
