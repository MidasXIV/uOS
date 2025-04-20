export type AnalysisStatus = 'Off Task' | 'On Task' | 'Unclear' | 'Unresolved';

export interface IAnalysisResult {
  observations: {
    currentActivity?: string;
    distractions?: string[];
    patterns?: string[];
    suggestions?: string[];
    unresolvedIssues?: string[];
  };
  project?: {
    confidence: number;
    name: string;
    task?: string;
  };
  rawResponse: string;
  status: AnalysisStatus;
  timeSpent?: {
    hours: number;
    minutes: number;
  };
}
