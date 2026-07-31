import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export default function Home() {
  const navigate = useNavigate();
  const [examOpen, setExamOpen] = useState(false);

  // Today's stats
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todayAttempts = useLiveQuery(
    () => db.attempts.where('answeredAt').aboveOrEqual(todayStart).toArray(),
    [todayStart],
  );

  const dueCount = useLiveQuery(
    () => db.cards.where('due').belowOrEqual(new Date()).count(),
  );

  const newCount = useLiveQuery(async () => {
    const cardIds = new Set(
      (await db.cards.toCollection().primaryKeys()) as string[],
    );
    return db.questions.filter((q) => !cardIds.has(q.id)).count();
  });

  const wrongCount = useLiveQuery(
    () => db.cards.filter((c) => !c.lastCorrect).count(),
  );

  // Available exam papers
  const examPapers = useLiveQuery(async () => {
    const questions = await db.questions.toArray();
    const map = new Map<
      string,
      { year: number; session: number; subject: string; count: number }
    >();
    for (const q of questions) {
      const key = `${q.year}-${q.session}-${q.subject}`;
      const entry = map.get(key);
      if (entry) {
        entry.count++;
      } else {
        map.set(key, {
          year: q.year,
          session: q.session,
          subject: q.subject,
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.year - a.year || b.session - a.session || a.subject.localeCompare(b.subject),
    );
  });

  const todayCorrect = todayAttempts?.filter((a) => a.correct).length ?? 0;
  const todayTotal = todayAttempts?.length ?? 0;
  const accuracy = todayTotal > 0 ? Math.round((todayCorrect / todayTotal) * 100) : 0;
  const reviewTotal = (dueCount ?? 0) + (newCount ?? 0);

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">證照刷題</h1>

      {/* Today's stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label="待複習" value={reviewTotal} color="blue" />
        <StatCard label="今日已答" value={todayTotal} color="emerald" />
        <StatCard label="正確率" value={todayTotal > 0 ? `${accuracy}%` : '-'} color="amber" />
      </div>

      {/* Mode cards */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        選擇模式
      </h2>
      <div className="space-y-3">
        {/* Today's Review */}
        <ModeCard
          title="今日複習"
          description="FSRS 排程到期的題目 + 新題"
          count={reviewTotal > 0 ? reviewTotal : undefined}
          onClick={() => navigate('/quiz/review')}
          disabled={reviewTotal === 0}
        />

        {/* Exam Mode */}
        <div>
          <ModeCard
            title="試卷模式"
            description="依年度與科目作答整份試卷"
            onClick={() => setExamOpen(!examOpen)}
            chevron={examOpen ? 'up' : 'down'}
          />
          {examOpen && (
            <div className="ml-4 mt-2 space-y-2">
              {examPapers?.map((p) => (
                <button
                  key={`${p.year}-${p.session}-${p.subject}`}
                  className="w-full text-left px-4 py-3 bg-white rounded-lg border border-gray-200 active:bg-gray-50"
                  onClick={() =>
                    navigate(
                      `/quiz/exam?year=${p.year}&session=${p.session}&subject=${encodeURIComponent(p.subject)}`,
                    )
                  }
                >
                  <span className="text-sm font-medium text-gray-800">
                    {p.year} 年第 {p.session} 梯 — {p.subject}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">{p.count} 題</span>
                </button>
              ))}
              {examPapers?.length === 0 && (
                <p className="text-sm text-gray-400 px-4">尚無題庫</p>
              )}
            </div>
          )}
        </div>

        {/* Wrong Mode */}
        <ModeCard
          title="錯題練習"
          description="重新練習答錯的題目"
          count={wrongCount && wrongCount > 0 ? wrongCount : undefined}
          onClick={() => navigate('/quiz/wrong')}
          disabled={!wrongCount || wrongCount === 0}
        />

        {/* Random Mode */}
        <ModeCard
          title="隨機刷題"
          description="隨機抽 10 題練習"
          onClick={() => navigate('/quiz/random')}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: 'blue' | 'emerald' | 'amber';
}) {
  const bg = {
    blue: 'bg-blue-50',
    emerald: 'bg-emerald-50',
    amber: 'bg-amber-50',
  }[color];
  const text = {
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
  }[color];

  return (
    <div className={`${bg} rounded-xl p-4 text-center`}>
      <p className={`text-2xl font-bold ${text}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function ModeCard({
  title,
  description,
  count,
  onClick,
  disabled,
  chevron,
}: {
  title: string;
  description: string;
  count?: number;
  onClick: () => void;
  disabled?: boolean;
  chevron?: 'up' | 'down';
}) {
  return (
    <button
      className={`w-full text-left px-5 py-4 bg-white rounded-xl border border-gray-200 flex items-center gap-4 transition-colors ${
        disabled ? 'opacity-40' : 'active:bg-gray-50'
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      {count !== undefined && (
        <span className="shrink-0 bg-blue-100 text-blue-700 text-sm font-semibold px-2.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
      {chevron && (
        <svg
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${chevron === 'up' ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      )}
      {!chevron && !count && (
        <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      )}
    </button>
  );
}
