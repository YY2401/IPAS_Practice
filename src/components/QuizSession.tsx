import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { processAnswer, getDueQuestionIds, getNewQuestionIds, getWrongQuestionIds } from '../fsrs/scheduler';
import type { Question, QuizMode, SessionResult } from '../types';
import QuizCard from './QuizCard';

export default function QuizSession() {
  const { mode } = useParams<{ mode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [phase, setPhase] = useState<'loading' | 'empty' | 'quiz' | 'done'>('loading');
  const [sessionStart] = useState(Date.now());

  // Load questions based on mode
  useEffect(() => {
    async function load() {
      let qs: Question[] = [];

      switch (mode as QuizMode) {
        case 'review': {
          const dueIds = await getDueQuestionIds();
          const newIds = await getNewQuestionIds(20);
          const allIds = [...dueIds, ...newIds];
          if (allIds.length > 0) {
            qs = await db.questions.where('id').anyOf(allIds).toArray();
            // Due cards first, then new
            const dueSet = new Set(dueIds);
            qs.sort((a, b) => {
              const aIsDue = dueSet.has(a.id) ? 0 : 1;
              const bIsDue = dueSet.has(b.id) ? 0 : 1;
              return aIsDue - bIsDue;
            });
          }
          break;
        }
        case 'exam': {
          const year = Number(searchParams.get('year'));
          const session = Number(searchParams.get('session'));
          const subject = searchParams.get('subject') ?? '';
          qs = await db.questions
            .filter(
              (q) => q.year === year && q.session === session && q.subject === subject,
            )
            .toArray();
          qs.sort((a, b) => a.number - b.number);
          break;
        }
        case 'wrong': {
          const wrongIds = await getWrongQuestionIds();
          if (wrongIds.length > 0) {
            qs = await db.questions.where('id').anyOf(wrongIds).toArray();
          }
          break;
        }
        case 'random': {
          const all = await db.questions.filter((q) => !q.hasImage).toArray();
          // Fisher-Yates shuffle
          for (let i = all.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [all[i], all[j]] = [all[j], all[i]];
          }
          qs = all.slice(0, 10);
          break;
        }
      }

      // Filter out image questions (v1 skip)
      qs = qs.filter((q) => !q.hasImage);

      if (qs.length === 0) {
        setPhase('empty');
      } else {
        setQuestions(qs);
        setPhase('quiz');
      }
    }

    load();
  }, [mode, searchParams]);

  const handleNext = useCallback(
    async (selected: string, correct: boolean, guessed: boolean) => {
      const question = questions[currentIndex];

      // Save attempt
      await db.attempts.add({
        questionId: question.id,
        answeredAt: Date.now(),
        selected,
        correct,
        durationMs: 0, // TODO: track per-question time
        mode: mode as QuizMode,
      });

      // Update FSRS card
      await processAnswer(question.id, correct, guessed);

      // Record result
      const result: SessionResult = {
        questionId: question.id,
        selected,
        correct,
        guessed,
        timeMs: 0,
      };
      const newResults = [...results, result];
      setResults(newResults);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setPhase('done');
      }
    },
    [questions, currentIndex, results, mode],
  );

  // --- Loading ---
  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-white">
        <p className="text-gray-400">載入題目中...</p>
      </div>
    );
  }

  // --- Empty ---
  if (phase === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center bg-white">
        <p className="text-gray-500 mb-6">
          {mode === 'review'
            ? '目前沒有需要複習的題目，先用其他模式刷幾題吧！'
            : mode === 'wrong'
              ? '目前沒有答錯的題目，繼續保持！'
              : '找不到符合條件的題目。'}
        </p>
        <button
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold"
          onClick={() => navigate('/')}
        >
          返回首頁
        </button>
      </div>
    );
  }

  // --- Done ---
  if (phase === 'done') {
    const correctCount = results.filter((r) => r.correct).length;
    const accuracy = Math.round((correctCount / results.length) * 100);
    const totalTime = Math.round((Date.now() - sessionStart) / 1000);
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;

    return (
      <div className="min-h-dvh bg-white px-6 py-12">
        <div className="text-center mb-8">
          <div className="text-5xl font-bold text-blue-600 mb-2">{accuracy}%</div>
          <p className="text-gray-500">正確率</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-gray-900">{results.length}</p>
            <p className="text-xs text-gray-500 mt-1">總題數</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-emerald-600">{correctCount}</p>
            <p className="text-xs text-gray-500 mt-1">答對</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-gray-900">
              {minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}s`}
            </p>
            <p className="text-xs text-gray-500 mt-1">用時</p>
          </div>
        </div>

        {/* Wrong answers summary */}
        {results.some((r) => !r.correct) && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">答錯的題目</h3>
            <div className="space-y-2">
              {results
                .filter((r) => !r.correct)
                .map((r) => {
                  const q = questions.find((q) => q.id === r.questionId);
                  if (!q) return null;
                  return (
                    <div key={r.questionId} className="bg-white rounded-xl p-4 border border-red-100">
                      <p className="text-sm text-gray-800 line-clamp-2">{q.question}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        你的答案：<span className="text-red-500 font-medium">{r.selected}</span>
                        {'　'}正確：<span className="text-emerald-600 font-medium">{q.answer}</span>
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <button
          className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl active:bg-blue-700"
          onClick={() => navigate('/')}
        >
          返回首頁
        </button>
      </div>
    );
  }

  // --- Quiz ---
  return (
    <div className="relative">
      {/* Exit button */}
      <button
        className="absolute top-3 left-3 z-10 p-2 text-gray-400 active:text-gray-600"
        onClick={() => navigate('/')}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>

      <QuizCard
        question={questions[currentIndex]}
        index={currentIndex}
        total={questions.length}
        onNext={handleNext}
      />
    </div>
  );
}
