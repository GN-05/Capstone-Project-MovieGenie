import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import { WatchlistProvider } from './watchlist/WatchlistContext.jsx';
import { GenieProvider } from './genie/GenieContext.jsx';
import App from './App.jsx';
import './index.css';

createRoot(
  document.getElementById('root')
).render(
  <BrowserRouter>
    <AuthProvider>
      <WatchlistProvider>
        <GenieProvider>
          <App />
        </GenieProvider>
      </WatchlistProvider>
    </AuthProvider>
  </BrowserRouter>
);
