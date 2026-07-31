import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface WrongItem {
  questionId: string;
  questionText: string;
  subject: string;
  answer: string;
  lastSelected: string;
  wrongCount: number;
  lastAnsweredAt: number;
  tags: string[];
}

export default function WrongBook() {
  const navigate = useNavigate();
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);

  const wrongItems = useLiveQuery(async () => {
    const wrongCards = await db.cards.filter((c) => !c.lastCorrect).toArray();
    if (!wrongCards.length) return [];

    const items: WrongItem[] = [];
    for (const card of wrongCards) {
      const question = await db.questions.get(card.questionId);
      if (!question) continue;

      const attempts = await db.attempts
        .where('questionId')
        .equals(card.questionId)
        .toArray();

      const wrongCount = attempts.filter((a) => !a.correct).length;
      const lastAttempt = attempts.sort((a, b) => b.answeredAt - a.answeredAt)[0];

      items.push({
        questionId: card.questionId,
        questionText: question.question,
        subject: question.subject,
        answer: question.answer,
        lastSelected: lastAttempt?.selected ?? '?',
        wrongCount,
        lastAnsweredAt: lastAttempt?.answeredAt ?? 0,
        tags: question.tags,
      });
    }

    return items.sort((a, b) => b.lastAnsweredAt - a.lastAnsweredAt);
  });

  // Get unique subjects for filter
  const subjects = wrongItems
    ? [...new Set(wrongItems.map((i) => i.subject))]
    : [];

  const filtered = subjectFilter
    ? wrongItems?.filter((i) => i.subject === subjectFilter)
    : wrongItems;

  function relativeTime(ts: number) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '剛剛';
    if (mins < 60) return `${mins} 分鐘前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小時前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
  }

  if (wrongItems === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">載入中...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">錯題本</h1>

      {wrongItems.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-gray-400">目前沒有答錯的題目</p>
          <p className="text-gray-400 text-sm mt-1">繼續保持！</p>
        </div>
      ) : (
        <>
          {/* Subject filter chips */}
          {subjects.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              <button
                className={`shrink-0 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  !subjectFilter
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
                onClick={() => setSubjectFilter(null)}
              >
                全部 ({wrongItems.length})
              </button>
              {subjects.map((s) => {
                const count = wrongItems.filter((i) => i.subject === s).length;
                return (
                  <button
                    key={s}
                    className={`shrink-0 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      subjectFilter === s
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                    onClick={() => setSubjectFilter(s)}
                  >
                    {s.replace('資訊安全', '')} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Wrong items list */}
          <div className="space-y-3 mb-6">
            {filtered?.map((item) => (
              <div
                key={item.questionId}
                className="bg-white rounded-xl p-4 border border-gray-200"
              >
                <p className="text-sm text-gray-800 line-clamp-2 mb-2">
                  {item.questionText}
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    你答 <span className="text-red-500 font-medium">{item.lastSelected}</span>
                    {'　'}正確 <span className="text-emerald-600 font-medium">{item.answer}</span>
                    {'　'}錯 {item.wrongCount} 次
                  </div>
                  <span className="text-xs text-gray-400">
                    {relativeTime(item.lastAnsweredAt)}
                  </span>
                </div>
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Practice button */}
          <button
            className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl active:bg-blue-700 mb-4"
            onClick={() => navigate('/quiz/wrong')}
          >
            練習全部錯題 ({filtered?.length ?? 0} 題)
          </button>
        </>
      )}
    </div>
  );
}
