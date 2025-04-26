export type AnalysisStatus = "Error" | "Mixed Activity" | "Off Task" | "On Task" | "Unclear" | "Unresolved";

export interface IAnalysisResult {
  analysis?: {
    offTask: {
      activity: string;
      details: string;
      suggestion: string;
    }[];
    onTask: {
      confidence: number; // 0-100
      estimatedTimeSpent: string; // e.g. "15 minutes" or "likely continuous"
      evidence: string;
      project: string;
      task: string;
    }[];
    unresolved: {
      observation: string;
      possibleIssue: string;
      potentialProject: string;
    }[];
  };
  generalObservations?: {
    elements: string[];
    flags: string[];
    habits: string;
    potentialDistractions: string[];
    suggestions: string[];
  };
  rawResponse?: string; // Keep this if you want to debug/store the original
  status: AnalysisStatus;
  summary: string;
}
