export interface Transcript {
  id: number;
  speaker: 'AI' | 'You';
  text: string;
}

export type InterviewStatus = 'connecting' | 'listening' | 'speaking' | 'processing' | 'ended' | 'error' | 'moderating';