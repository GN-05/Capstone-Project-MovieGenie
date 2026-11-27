import { lazy, Suspense, useEffect } from 'react';
import {
  Routes, Route, useLocation, useNavigationType,
} from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import RequireAuth from './auth/RequireAuth.jsx';
import BrowsePage from './pages/BrowsePage.jsx';   // first screen: eager

// the other pages load only when the user opens them
const MoviePage = lazy(() => import('./pages/MoviePage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const SignupPage = lazy(() => import('./pages/SignupPage.jsx'));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage.jsx'));
const GeniePage = lazy(() => import('./pages/GeniePage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

export default function App() {
  const { pathname, search } = useLocation();
  const cameBack = useNavigationType() === 'POP';   // Back or Forward button

  // a new page starts at the top; coming back keeps the old place
  useEffect(() => {
    if (!cameBack) window.scrollTo(0, 0);
  }, [pathname, search, cameBack]);

  return (
    <div className="page">
      <Header />
      <main className="page-main">
        <Suspense fallback={<p className="notice">Loading…</p>}>
          <Routes>
            {/* key: each list has its own search box */}
            <Route path="/" element={
              <BrowsePage key="trending" view="trending" />
            } />
            <Route path="/top-rated" element={
              <BrowsePage key="top-rated" view="top-rated" />
            } />
            <Route path="/genres" element={
              <BrowsePage key="genres" view="genres" />
            } />
            <Route path="/movie/:id" element={<MoviePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/watchlist" element={
              <RequireAuth><WatchlistPage /></RequireAuth>
            } />
            <Route path="/genie" element={
              <RequireAuth><GeniePage /></RequireAuth>
            } />
            <Route path="/settings" element={
              <RequireAuth><SettingsPage /></RequireAuth>
            } />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
