
export interface MedicalIndicator {
  term: string;
  category: 'Symptom' | 'Condition' | 'Body Part' | 'Severity';
  description: string;
}

export interface AnalysisResult {
  transcription?: string;
  detectedIndicators: MedicalIndicator[];
  summary: string;
  urgencyScore: number; // 1 to 10
  sentiment: 'Concerned' | 'Neutral' | 'Distressed' | 'Calm';
  recommendations: string[];
  imageAnalysis?: string;
}

export type InputMode = 'text' | 'image' | 'audio';

export interface FileData {
  base64: string;
  mimeType: string;
  fileName: string;
}
