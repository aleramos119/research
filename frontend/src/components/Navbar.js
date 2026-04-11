import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="brand">ResearchHub</Link>
      <div className="nav-actions">
        {user && (
          <>
            <Link to={`/${user.username}`} className="nav-link">{user.username}</Link>
            <button className="btn btn-sm btn-outline" onClick={logout}>Sign out</button>
          </>
        )}
      </div>
    </nav>
  );
}
