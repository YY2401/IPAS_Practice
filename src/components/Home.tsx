import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { CertCode } from '../types';

const CERT_LABELS: Record<CertCode, string> = {
  ISE: 'iPAS 資訊安全工程師（初級）',
  MLE: 'iPAS 機器學習工程師（初級）',
  BDA: 'iPAS 巨量資料分析師（初級）',
  AIE: 'iPAS 人工智慧工程師（初級）',
  BK: '記帳士',
};

const CERT_ORDER: CertCode[] = ['ISE', 'MLE', 'BDA', 'AIE', 'BK'];

export default function Home() {
  const navigate = useNavigate();
  const [expandedCert, setExpandedCert] = useState<CertCode | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

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

  // Build cert → subject → papers hierarchy
  const certTree = useLiveQuery(async () => {
    const questions = await db.questions.toArray();
    const tree = new Map<
      CertCode,
      {
        totalCount: number;
        subjects: Map<
          string,
          {
            count: number;
            papers: { year: number; session: number; count: number }[];
          }
        >;
      }
    >();

    for (const q of questions) {
      if (!tree.has(q.cert as CertCode)) {
        tree.set(q.cert as CertCode, { totalCount: 0, subjects: new Map() });
      }
      const cert = tree.get(q.cert as CertCode)!;
      cert.totalCount++;

      if (!cert.subjects.has(q.subject)) {
        cert.subjects.set(q.subject, { count: 0, papers: [] });
      }
      const subj = cert.subjects.get(q.subject)!;
      subj.count++;

      const existing = subj.papers.find(
        (p) => p.year === q.year && p.session === q.session,
      );
      if (existing) {
        existing.count++;
      } else {
        subj.papers.push({ year: q.year, session: q.session, count: 1 });
      }
    }

    // Sort papers by year desc, session desc
    for (const cert of tree.values()) {
      for (const subj of cert.subjects.values()) {
        subj.papers.sort((a, b) => b.year - a.year || b.session - a.session);
      }
    }

    return tree;
  });

  const todayCorrect = todayAttempts?.filter((a) => a.correct).length ?? 0;
  const todayTotal = todayAttempts?.length ?? 0;
  const accuracy = todayTotal > 0 ? Math.round((todayCorrect / todayTotal) * 100) : 0;
  const reviewTotal = (dueCount ?? 0) + (newCount ?? 0);

  function toggleCert(cert: CertCode) {
    if (expandedCert === cert) {
      setExpandedCert(null);
      setExpandedSubject(null);
    } else {
      setExpandedCert(cert);
      setExpandedSubject(null);
    }
  }

  function toggleSubject(subject: string) {
    setExpandedSubject(expandedSubject === subject ? null : subject);
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">證照刷題</h1>

      {/* Today's stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label="待複習" value={reviewTotal} color="blue" />
        <StatCard label="今日已答" value={todayTotal} color="emerald" />
        <StatCard label="正確率" value={todayTotal > 0 ? `${accuracy}%` : '-'} color="amber" />
      </div>

      {/* Quick modes */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        快速練習
      </h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
        <QuickButton
          label="今日複習"
          count={reviewTotal}
          disabled={reviewTotal === 0}
          onClick={() => navigate('/quiz/review')}
          color="blue"
        />
        <QuickButton
          label="錯題練習"
          count={wrongCount ?? 0}
          disabled={!wrongCount || wrongCount === 0}
          onClick={() => navigate('/quiz/wrong')}
          color="red"
        />
        <QuickButton
          label="隨機刷題"
          onClick={() => navigate('/quiz/random')}
          color="emerald"
        />
      </div>

      {/* Cert → Subject → Paper tree */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        試卷模式
      </h2>
      <div className="space-y-3">
        {CERT_ORDER.filter((c) => certTree?.has(c)).map((certCode) => {
          const cert = certTree!.get(certCode)!;
          const isOpen = expandedCert === certCode;

          return (
            <div key={certCode}>
              {/* Cert level */}
              <button
                className="w-full text-left px-5 py-4 bg-white rounded-xl border border-gray-200 flex items-center gap-3 active:bg-gray-50"
                onClick={() => toggleCert(certCode)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-900">
                    {CERT_LABELS[certCode]}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    共 {cert.totalCount} 題・{cert.subjects.size} 科目
                  </p>
                </div>
                <Chevron open={isOpen} />
              </button>

              {/* Subject level */}
              {isOpen && (
                <div className="ml-3 mt-2 space-y-2">
                  {Array.from(cert.subjects.entries())
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([subject, data]) => {
                      const subjOpen = expandedSubject === subject;
                      return (
                        <div key={subject}>
                          <button
                            className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg border border-gray-150 flex items-center gap-3 active:bg-gray-100"
                            onClick={() => toggleSubject(subject)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800">
                                {subject}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400">{data.count} 題</span>
                            <Chevron open={subjOpen} />
                          </button>

                          {/* Paper level */}
                          {subjOpen && (
                            <div className="ml-4 mt-1.5 space-y-1.5">
                              {data.papers.map((p) => (
                                <button
                                  key={`${p.year}-${p.session}`}
                                  className="w-full text-left px-4 py-2.5 bg-white rounded-lg border border-gray-200 flex items-center active:bg-gray-50"
                                  onClick={() =>
                                    navigate(
                                      `/quiz/exam?year=${p.year}&session=${p.session}&subject=${encodeURIComponent(subject)}`,
                                    )
                                  }
                                >
                                  <span className="flex-1 text-sm text-gray-700">
                                    {p.year} 年第 {p.session} 梯
                                  </span>
                                  <span className="text-xs text-gray-400">{p.count} 題</span>
                                  <svg className="w-4 h-4 text-gray-300 ml-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                  </svg>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
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

function QuickButton({
  label,
  count,
  disabled,
  onClick,
  color,
}: {
  label: string;
  count?: number;
  disabled?: boolean;
  onClick: () => void;
  color: 'blue' | 'red' | 'emerald';
}) {
  const bgColor = {
    blue: 'bg-blue-600 active:bg-blue-700',
    red: 'bg-red-600 active:bg-red-700',
    emerald: 'bg-emerald-600 active:bg-emerald-700',
  }[color];

  return (
    <button
      className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl text-white font-semibold text-sm ${bgColor} ${
        disabled ? 'opacity-40' : ''
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs font-normal opacity-80 mt-0.5">{count} 題</span>
      )}
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
