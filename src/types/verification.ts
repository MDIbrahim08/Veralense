export interface ExtractedClaim {
  id: string;
  text: string;
  originalSpan: string;
  isTimeSensitive?: boolean;
}

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  publishedDate?: string | null;
  domain: string;
  authorityLevel: 'authoritative' | 'credible' | 'unverified';
  authorityScore?: number; // 0-100
}

export interface CognitiveAnalysis {
  sentiment: {
    label: 'hostile' | 'negative' | 'neutral' | 'positive' | 'optimistic';
    score: number; // 0-100
    description: string;
  };
  bias: {
    label: 'left' | 'center-left' | 'neutral' | 'center-right' | 'right';
    description: string;
    certainty: number; // 0-100
  };
  narrativeAnalysis: string;
}

export type Verdict = 'true' | 'partially_true' | 'false' | 'unverifiable' | 'conflicting';

export interface ClaimVerification {
  claimId: string;
  claim: ExtractedClaim;
  verdict: Verdict;
  confidence: number;
  chainOfThought: string;
  correction?: string | null;
  accuratePart?: string | null;
  misleadingPart?: string | null;
  conflictingSourcesSummary?: string | null;
  usedSourceUrls: string[];
  searchQueries: string[];
  evidenceSources: SearchResult[];
  totalSourcesRetrieved: number;
  totalSourcesUsed: number;
  wasReviewed: boolean;
  initialVerdict?: string;
  initialConfidence?: number;
}

export interface AIDetectionResult {
  overallProbability: number;
  indicators: {
    vocabularyEntropy: number;
    sentenceLengthUniformity: number;
    hedgingLanguage: number;
    structuralRepetition: number;
    perplexityEstimate: number;
  };
  explanation: string;
  verdict: 'likely_ai' | 'uncertain' | 'likely_human';
}

export interface ImageAnalysis {
  imageUrl: string;
  isAiGenerated: boolean;
  confidence: number;
  indicators: string[];
  verdict: 'ai_generated' | 'likely_manipulated' | 'appears_authentic' | 'uncertain';
}

export interface PipelineStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  startTime?: number;
  endTime?: number;
  detail?: string;
  error?: string;
}

export interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface AudioAnalysis {
  audioUrl?: string;
  verdict: 'ai_generated' | 'likely_synthetic' | 'appears_authentic' | 'unverified';
  confidence: number;
  indicators: string[];
  transcription?: string;
}

export interface VerificationReport {
  inputText: string;
  inputUrl?: string;
  claims: ExtractedClaim[];
  verifications: ClaimVerification[];
  aiDetection?: AIDetectionResult;
  imageAnalyses?: ImageAnalysis[];
  audioAnalyses?: AudioAnalysis[];
  cognitiveAnalysis?: CognitiveAnalysis;
  timestamp: string;
  totalElapsedMs: number;
}
