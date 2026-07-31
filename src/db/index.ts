import Dexie, { type Table } from 'dexie';
import type { Question, Attempt, StoredCard } from '../types';

class QuizDB extends Dexie {
  questions!: Table<Question>;
  attempts!: Table<Attempt>;
  cards!: Table<StoredCard>;

  constructor() {
    super('QuizDB');
    this.version(1).stores({
      questions: 'id, cert, subject, year',
      attempts: '++id, questionId, answeredAt, correct, mode',
      cards: 'questionId, due, state',
    });
  }
}

export const db = new QuizDB();

/**
 * Load questions from the bundled JSON into IndexedDB.
 * Uses bulkPut (upsert) so existing questions are updated
 * without destroying attempt/card data.
 */
export async function seedQuestions(): Promise<number> {
  const url = `${import.meta.env.BASE_URL}data/questions.json`;
  const res = await fetch(url);
  const questions: Question[] = await res.json();
  await db.questions.bulkPut(questions);
  return questions.length;
}
