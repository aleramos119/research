import React, { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';

export default function Home() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const debounceTimer = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(`/api/search/?q=${encodeURIComponent(q)}`);
      setResults(res.data);
    } catch {
      setResults(null);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearch = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSearch(q), 300);
  };

  const noResults = results && results.users.length === 0 && results.publications.length === 0;

  return (
    <div className="page home">
      <Navbar />

      <div className="search-hero">
        <h1>Discover research</h1>
        <input
          className="search-input"
          type="search"
          placeholder="Search users or publications…"
          value={query}
          onChange={handleSearch}
          autoFocus
        />
      </div>

      {searching && <p className="hint">Searching…</p>}

      {!query && !results && (
        <p className="hint">Start typing to search for users or publications.</p>
      )}

      {noResults && (
        <p className="hint">No results for "{query}".</p>
      )}

      {results && !noResults && (
        <div className="search-results">
          {results.users.length > 0 && (
            <section>
              <h2>Authors</h2>
              <ul className="result-list">
                {results.users.map((u) => (
                  <li key={u.id}>
                    <Link to={`/${u.username}`}>
                      <strong>{u.first_name || u.username} {u.last_name}</strong>
                      <span className="sub"> @{u.username}</span>
                      {u.university && <span className="sub"> · {u.university}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.publications.length > 0 && (
            <section>
              <h2>Publications</h2>
              <ul className="result-list">
                {results.publications.map((pub) => (
                  <li key={pub.id}>
                    <div>
                      <strong>{pub.title}</strong>
                      <span className="sub"> {pub.year}</span>
                      {pub.journal && <span className="sub"> · {pub.journal}</span>}
                    </div>
                    <div className="pub-authors">
                      {pub.authors?.map((a) => (
                        <Link key={a.id} to={`/${a.username}`} className="author-chip">
                          {a.first_name || a.username} {a.last_name}
                        </Link>
                      ))}
                    </div>
                    <a
                      href={`/api/publications/${pub.id}/file/`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm"
                    >
                      Download PDF
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
