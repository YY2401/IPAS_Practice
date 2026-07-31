export type CertCode = 'ISE' | 'BK';

export interface Question {
  id: string;
  cert: CertCode;
  subject: string;
  level: string;
  year: number;
  session: number;
  number: number;
  type: 'single';
  question: string;
  options: string[];
  answer: string; // 'A' | 'B' | 'C' | 'D'
  explanation: string | null;
  tags: string[];
  source: string;
  hasImage: boolean;
}

export type QuizMode = 'review' | 'exam' | 'wrong' | 'random';

export interface Attempt {
  id?: number;
  questionId: string;
  answeredAt: number;
  selected: string;
  correct: boolean;
  durationMs: number;
  mode: QuizMode;
}

/** FSRS card persisted in IndexedDB, keyed by questionId. */
export interface StoredCard {
  questionId: string;
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number; // ts-fsrs State enum value
  last_review?: Date;
  /** Whether the most recent attempt was correct. */
  lastCorrect: boolean;
}

export interface SessionResult {
  questionId: string;
  selected: string;
  correct: boolean;
  guessed: boolean;
  timeMs: number;
}
