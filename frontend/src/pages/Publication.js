import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const TYPE_LABELS = {
  journal: 'Journal Article',
  conference: 'Conference Paper',
  book: 'Book',
  chapter: 'Book Chapter',
  thesis: 'Thesis',
  preprint: 'Preprint',
  other: 'Other',
};

export default function Publication() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pub, setPub] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get(`/api/publications/${id}/`)
      .then((res) => setPub(res.data))
      .catch(() => setError('Publication not found.'));
  }, [id]);

  const handleDelete = async () => {
    const multipleAuthors = pub.authors && pub.authors.length > 1;
    const msg = multipleAuthors
      ? 'Remove yourself as an author of this publication?'
      : 'Delete this publication? This cannot be undone.';
    if (!window.confirm(msg)) return;
    setDeleting(true);
    try {
      await api.delete(`/api/publications/${id}/`);
      navigate('/');
    } catch {
      setError('Could not delete publication.');
      setDeleting(false);
    }
  };

  if (error) return (
    <div className="page">
      <Navbar />
      <p className="error" style={{ marginTop: '2rem' }}>{error}</p>
    </div>
  );

  if (!pub) return (
    <div className="page">
      <Navbar />
      <p style={{ marginTop: '2rem', color: '#6b7280' }}>Loading…</p>
    </div>
  );

  const isAuthor = pub.authors.some((a) => a.id === user?.id);
  const keywords = pub.keywords ? pub.keywords.split(',').map((k) => k.trim()).filter(Boolean) : [];

  return (
    <div className="page">
      <Navbar />

      <div className="pub-detail">
        {/* Header */}
        <div className="pub-detail-header">
          <div className="pub-detail-type">{TYPE_LABELS[pub.publication_type] || pub.publication_type}</div>
          <h1 className="pub-detail-title">{pub.title}</h1>

          {/* Authors */}
          <div className="pub-detail-authors">
            {pub.authors.map((a) => (
              <Link key={a.id} to={`/${a.username}`} className="author-chip">
                {a.first_name || a.username} {a.last_name}
              </Link>
            ))}
          </div>
        </div>

        {/* Meta row */}
        <div className="pub-detail-meta">
          {pub.journal && <span>{pub.journal}</span>}
          {pub.year && <span>{pub.year}</span>}
          {pub.volume && <span>Vol. {pub.volume}{pub.issue ? `, No. ${pub.issue}` : ''}</span>}
          {pub.pages && <span>pp. {pub.pages}</span>}
          {pub.publisher && <span>{pub.publisher}</span>}
        </div>

        {/* Identifiers */}
        {(pub.doi || pub.isbn || pub.url) && (
          <div className="pub-detail-ids">
            {pub.doi && <span>DOI: <a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noreferrer">{pub.doi}</a></span>}
            {pub.isbn && <span>ISBN: {pub.isbn}</span>}
            {pub.url && <a href={pub.url} target="_blank" rel="noreferrer">External link</a>}
          </div>
        )}

        {/* Stats */}
        <div className="pub-detail-stats">
          <div className="stat">
            <span>{pub.citations}</span>
            <label>Citations</label>
          </div>
        </div>

        {/* Abstract */}
        {pub.abstract && (
          <section className="pub-detail-section">
            <h2>Abstract</h2>
            <p className="pub-abstract">{pub.abstract}</p>
          </section>
        )}

        {/* Keywords */}
        {keywords.length > 0 && (
          <section className="pub-detail-section">
            <h2>Keywords</h2>
            <div className="pub-keywords">
              {keywords.map((k) => (
                <span key={k} className="keyword-chip">{k}</span>
              ))}
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="pub-detail-actions">
          {pub.pdf && (
            <a
              href={`/api/publications/${pub.id}/file/`}
              target="_blank"
              rel="noreferrer"
              className="btn"
            >
              Download PDF
            </a>
          )}
          {isAuthor && (
            <button
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting
                ? 'Removing…'
                : pub.authors.length > 1 ? 'Remove my authorship' : 'Delete publication'}
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="pub-detail-footer">
          Uploaded by{' '}
          {pub.uploaded_by
            ? <Link to={`/${pub.uploaded_by.username}`}>@{pub.uploaded_by.username}</Link>
            : 'a deleted user'
          }
          {pub.created_at && ` on ${new Date(pub.created_at).toLocaleDateString()}`}
        </p>
      </div>
    </div>
  );
}
