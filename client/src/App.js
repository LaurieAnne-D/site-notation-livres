import { useEffect, useState } from "react";
import Box from "./components/ui/Box";
import BooksList from "./components/BooksList";
import BookDetail from "./components/BookDetail";
import AuthPanel from "./components/AuthPanel";
import SagasList from "./components/SagasList";
import SagaDetail from "./components/SagaDetail";
import { API_BASE } from "./lib/api";
import "./styles.css";

function useLocalStorage(key, initial) {
  const [v, setV] = useState(() => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : initial;
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(v)), [key, v]);
  return [v, setV];
}

export default function App() {
  const [token, setToken] = useLocalStorage("jwt", "");
  const [picked, setPicked] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [pickedSaga, setPickedSaga] = useState(null);


  return (
    <div className="page">
      <div className="page__wrap">
        <header className="header">
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>📚 Site Notation — Demo Front (CRA)</h1>
          <a href={API_BASE} target="_blank" rel="noreferrer" className="header__link">Ouvrir l’API</a>
        </header>

        <AuthPanel token={token} setToken={setToken} />

        <div className="grid-2">
          <BooksList key={refreshFlag} token={token} onPickBook={(b) => setPicked(b)} />
          {picked ? (
            <BookDetail
              book={picked}
              token={token}
              onRefreshBook={() => setRefreshFlag((x) => x + 1)}
            />
          ) : (
            <Box>
              <div className="muted">
                Sélectionne un livre à gauche pour voir le détail, les avis et le journal.
              </div>
            </Box>
          )}
        </div>
        <div className="grid-2">
          <SagasList token={token} onPickSaga={(s) => setPickedSaga(s)} />
          {pickedSaga ? (
            <SagaDetail
              sagaId={pickedSaga._id}
              token={token}
              onChanged={() => {/* éventuellement relancer une liste */ }}
            />
          ) : (
            <Box><div className="muted">Sélectionne une saga à gauche.</div></Box>
          )}
        </div>
      </div>
    </div>
  );
}


