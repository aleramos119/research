import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';

export default function Profile() {
  const { username } = useParams();
  const { user: me, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [publications, setPublications] = useState([]);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isOwn = me?.username === username;

  useEffect(() => {
    setError('');
    Promise.all([
      api.get(`/api/users/${username}/`),
      api.get(`/api/publications/?author=${username}`),
    ])
      .then(([profileRes, pubsRes]) => {
        setProfile(profileRes.data);
        setPublications(pubsRes.data.results ?? pubsRes.data);
      })
      .catch(() => setError('User not found.'));
  }, [username]);

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteAccount();
      navigate('/');
    } catch {
      setError('Could not delete account.');
      setDeleting(false);
    }
  };

  const handleDeletePublication = async (id) => {
    if (!window.confirm('Delete this publication?')) return;
    try {
      await api.delete(`/api/publications/${id}/`);
      setPublications((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError('Could not delete publication.');
    }
  };

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!profile) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <Navbar />
      <div className="profile-header">
        <div>
          <h1>{profile.first_name || profile.username} {profile.last_name}</h1>
          <p className="username">@{profile.username}</p>
          {profile.university && <p>{profile.university}</p>}
          {profile.bio && <p className="bio">{profile.bio}</p>}
        </div>
        {isOwn && (
          <div className="profile-actions">
            <Link to="/upload" className="btn">Upload PDF</Link>
            <button
              className="btn btn-danger"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
        )}
      </div>

      <div className="stats">
        <div className="stat"><span>{profile.pdfs_uploaded_count}</span><label>Uploaded</label></div>
        <div className="stat"><span>{profile.pdfs_authored_count}</span><label>Authored</label></div>
        <div className="stat"><span>{profile.total_citations}</span><label>Citations</label></div>
        <div className="stat"><span>{profile.h_index}</span><label>H-index</label></div>
      </div>

      <h2>Publications</h2>
      {publications.length === 0 ? (
        <p className="empty">No publications yet.</p>
      ) : (
        <ul className="publication-list">
          {publications.map((pub) => (
            <li key={pub.id} className="publication-item">
              <div className="pub-meta">
                <strong>{pub.title}</strong>
                <span className="pub-year">{pub.year}</span>
                {pub.journal && <span className="pub-journal"> · {pub.journal}</span>}
              </div>
              <div className="pub-actions">
                <a
                  href={`/api/publications/${pub.id}/file/`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                >
                  Download PDF
                </a>
                {isOwn && (
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeletePublication(pub.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
