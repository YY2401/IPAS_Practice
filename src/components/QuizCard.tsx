import { useState, useRef } from 'react';
import type { Question } from '../types';

interface Props {
  question: Question;
  index: number;
  total: number;
  onNext: (selected: string, correct: boolean, guessed: boolean) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function QuizCard({ question, index, total, onNext }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [guessed, setGuessed] = useState(false);
  const startTime = useRef(Date.now());

  const answered = selected !== null;
  const isCorrect = selected === question.answer;

  function handleSelect(label: string) {
    if (answered) return;
    setSelected(label);
  }

  function handleNext() {
    if (!selected) return;
    onNext(selected, isCorrect, guessed);
    // Reset for next question
    setSelected(null);
    setGuessed(false);
    startTime.current = Date.now();
  }

  function optionStyle(label: string) {
    if (!answered) {
      return 'bg-white border-gray-200 active:bg-gray-50';
    }
    if (label === question.answer) {
      return 'bg-emerald-50 border-emerald-400 text-emerald-800';
    }
    if (label === selected && !isCorrect) {
      return 'bg-red-50 border-red-400 text-red-800';
    }
    return 'bg-white border-gray-100 text-gray-400';
  }

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-gray-500">
          第 {index + 1}/{total} 題
        </span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
          {question.subject}
        </span>
      </div>

      {/* Question */}
      <div className="px-4 pb-4 flex-1">
        <p className="selectable text-base leading-relaxed text-gray-900 mb-6">
          {question.question}
        </p>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((text, i) => {
            const label = OPTION_LABELS[i];
            return (
              <button
                key={label}
                className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all ${optionStyle(label)}`}
                onClick={() => handleSelect(label)}
                disabled={answered}
              >
                <span className="font-semibold mr-2">{label}.</span>
                <span className="selectable">{text}</span>
              </button>
            );
          })}
        </div>

        {/* Post-answer area */}
        {answered && (
          <div className="mt-6 space-y-4">
            {/* Result indicator */}
            <div
              className={`flex items-center gap-2 text-sm font-semibold ${
                isCorrect ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {isCorrect ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                  答對了！
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
                  </svg>
                  答錯了，正確答案是 {question.answer}
                </>
              )}
            </div>

            {/* "I guessed" toggle */}
            {isCorrect && (
              <button
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  guessed
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-gray-200 text-gray-500'
                }`}
                onClick={() => setGuessed(!guessed)}
              >
                {guessed ? '已標記為猜對' : '其實是猜的'}
              </button>
            )}

            {/* Explanation */}
            {question.explanation && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-400 mb-1">解析</p>
                <p className="selectable text-sm text-gray-700 leading-relaxed">
                  {question.explanation}
                </p>
              </div>
            )}

            {/* Tags */}
            {question.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {question.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom action */}
      {answered && (
        <div className="sticky bottom-0 p-4 bg-white/90 backdrop-blur border-t border-gray-100">
          <button
            className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl active:bg-blue-700 transition-colors"
            onClick={handleNext}
          >
            {index < total - 1 ? '下一題' : '完成'}
          </button>
        </div>
      )}
    </div>
  );
}
