import { createEmptyCard, fsrs, Rating, type Card } from 'ts-fsrs';
import { db } from '../db';
import type { StoredCard } from '../types';

const f = fsrs();

/** Convert a StoredCard back to a ts-fsrs Card (ensure Date types). */
function toCard(stored: StoredCard): Card {
  return {
    due: stored.due instanceof Date ? stored.due : new Date(stored.due),
    stability: stored.stability,
    difficulty: stored.difficulty,
    elapsed_days: stored.elapsed_days,
    scheduled_days: stored.scheduled_days,
    reps: stored.reps,
    lapses: stored.lapses,
    state: stored.state,
    last_review: stored.last_review
      ? stored.last_review instanceof Date
        ? stored.last_review
        : new Date(stored.last_review)
      : undefined,
  };
}

/** Convert a ts-fsrs Card to a StoredCard for IndexedDB. */
function toStored(card: Card, questionId: string, correct: boolean): StoredCard {
  return {
    questionId,
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as number,
    last_review: card.last_review,
    lastCorrect: correct,
  };
}

/**
 * Process a user's answer: create or update the FSRS card.
 *
 * Rating mapping:
 *   wrong       → Again
 *   correct+guessed → Hard
 *   correct     → Good
 */
export async function processAnswer(
  questionId: string,
  correct: boolean,
  guessed: boolean,
): Promise<void> {
  const now = new Date();

  const stored = await db.cards.get(questionId);
  const card: Card = stored ? toCard(stored) : createEmptyCard(now);

  const scheduling = f.repeat(card, now);

  let rating: Rating;
  if (!correct) {
    rating = Rating.Again;
  } else if (guessed) {
    rating = Rating.Hard;
  } else {
    rating = Rating.Good;
  }

  const result = scheduling[rating];
  await db.cards.put(toStored(result.card, questionId, correct));
}

/** Get question IDs that are due for review (due <= now). */
export async function getDueQuestionIds(limit = 100): Promise<string[]> {
  const now = new Date();
  const dueCards = await db.cards
    .where('due')
    .belowOrEqual(now)
    .limit(limit)
    .toArray();
  return dueCards.map((c) => c.questionId);
}

/** Get question IDs that have never been answered (no card exists). */
export async function getNewQuestionIds(limit = 20): Promise<string[]> {
  const existingIds = new Set(
    (await db.cards.toCollection().primaryKeys()) as string[],
  );
  const newQuestions = await db.questions
    .filter((q) => !existingIds.has(q.id) && !q.hasImage)
    .limit(limit)
    .toArray();
  return newQuestions.map((q) => q.id);
}

/** Get question IDs where the last attempt was wrong. */
export async function getWrongQuestionIds(): Promise<string[]> {
  const wrongCards = await db.cards
    .filter((c) => !c.lastCorrect)
    .toArray();
  return wrongCards.map((c) => c.questionId);
}
