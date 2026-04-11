import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const PUBLICATION_TYPES = [
  ['journal', 'Journal Article'],
  ['conference', 'Conference Paper'],
  ['book', 'Book'],
  ['chapter', 'Book Chapter'],
  ['thesis', 'Thesis'],
  ['preprint', 'Preprint'],
  ['other', 'Other'],
];

export default function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', abstract: '', publication_type: 'journal',
    journal: '', year: new Date().getFullYear(), doi: '', keywords: '',
  });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!file) {
      setError('Please select a PDF file.');
      return;
    }

    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    data.append('pdf', file);

    setUploading(true);
    try {
      await api.post('/api/publications/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      navigate(`/${user.username}`);
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 413) {
        setError('File is too large (max 20 MB).');
      } else if (data && typeof data === 'object') {
        setFieldErrors(data);
        if (data.pdf) setError(Array.isArray(data.pdf) ? data.pdf[0] : data.pdf);
      } else {
        setError('Upload failed.');
      }
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="page">
      <Navbar />
      <h1>Upload publication</h1>
      <form onSubmit={handleSubmit} className="upload-form">
        {error && <p className="error">{error}</p>}

        <label>
          PDF file *
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files[0] || null)}
            required
          />
        </label>

        <label>
          Title *
          <input name="title" value={form.title} onChange={handleChange} required />
          {fieldErrors.title && <span className="field-error">{fieldErrors.title}</span>}
        </label>

        <label>
          Type
          <select name="publication_type" value={form.publication_type} onChange={handleChange}>
            {PUBLICATION_TYPES.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </label>

        <label>
          Journal / Conference
          <input name="journal" value={form.journal} onChange={handleChange} />
        </label>

        <label>
          Year *
          <input name="year" type="number" min="1900" max="2100" value={form.year} onChange={handleChange} required />
          {fieldErrors.year && <span className="field-error">{fieldErrors.year}</span>}
        </label>

        <label>
          DOI
          <input name="doi" value={form.doi} onChange={handleChange} placeholder="10.xxxx/..." />
        </label>

        <label>
          Keywords (comma-separated)
          <input name="keywords" value={form.keywords} onChange={handleChange} />
        </label>

        <label>
          Abstract
          <textarea name="abstract" value={form.abstract} onChange={handleChange} rows={5} />
        </label>

        {uploading && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
            <span>{progress}%</span>
          </div>
        )}

        <button type="submit" disabled={uploading}>
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </form>
    </div>
  );
}
