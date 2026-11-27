import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';

// The genie's progress lives above the pages, so it survives a visit to a
// movie page: the Back button returns to the picks, not to step one.
const GenieContext = createContext(null);
export const useGenie = () => useContext(GenieContext);

export const NO_FILTERS = { genreId: '', yearFrom: '', yearTo: '', minRating: '' };

export function GenieProvider({ children }) {
  const { token } = useAuth();
  const [step, setStep] = useState('choose');   // choose | filters | results
  const [whole, setWhole] = useState(false);    // whole watchlist?
  const [seedIds, setSeedIds] = useState([]);
  const [form, setForm] = useState(NO_FILTERS);
  const [answer, setAnswer] = useState(null);

  // a new ask starts from nothing: no picked movies, no filters
  function reset() {
    setStep('choose');
    setWhole(false);
    setSeedIds([]);
    setForm(NO_FILTERS);
    setAnswer(null);
  }

  // another user logs in, or this one logs out: forget the last ask
  useEffect(() => {
    reset();
  }, [token]);

  const value = {
    step, setStep, whole, setWhole, seedIds, setSeedIds,
    form, setForm, answer, setAnswer, reset,
  };
  return <GenieContext.Provider value={value}>{children}</GenieContext.Provider>;
}
