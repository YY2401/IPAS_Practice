import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { seedQuestions } from './db';
import Layout from './components/Layout';
import Home from './components/Home';
import QuizSession from './components/QuizSession';
import WrongBook from './components/WrongBook';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedQuestions()
      .then((count) => {
        console.log(`[DB] Loaded ${count} questions`);
        setReady(true);
      })
      .catch((err) => {
        console.error('[DB] Failed to seed questions:', err);
        // Still mark as ready — the user might have data from a previous load
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-gray-50">
        <p className="text-gray-400">載入題庫中...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        {/* Tabs layout (with bottom nav) */}
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="wrong-book" element={<WrongBook />} />
        </Route>

        {/* Full-screen quiz (no bottom nav) */}
        <Route path="quiz/:mode" element={<QuizSession />} />
      </Routes>
    </HashRouter>
  );
}
