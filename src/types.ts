import { Feedback, SessionSummary } from './lib/gemini';

export interface InterviewConfig {
  type: string;
  role: string;
  difficulty: string;
  questionCount: number;
  character: 'professional' | 'tech' | 'creative';
}

export interface InterviewSession {
  id: string;
  date: string;
  config: InterviewConfig;
  questions: string[];
  feedbacks: Feedback[];
  summary: SessionSummary;
  cvText?: string;
}
