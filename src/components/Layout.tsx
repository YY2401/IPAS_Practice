import { Outlet, Link, useLocation } from 'react-router-dom';

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-dvh bg-gray-50 pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
      <Outlet />

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex pb-[env(safe-area-inset-bottom)]">
        <Link
          to="/"
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
            pathname === '/' ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
          <span className="text-xs font-medium">刷題</span>
        </Link>

        <Link
          to="/wrong-book"
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
            pathname === '/wrong-book' ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6A2.25 2.25 0 0 1 6 3.75h1.5m9 0h-9" />
          </svg>
          <span className="text-xs font-medium">錯題本</span>
        </Link>
      </nav>
    </div>
  );
}
