import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '', email: '', password: '',
    first_name: '', last_name: '', university: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        setFieldErrors(data);
      } else {
        setError('Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, type = 'text', required = false) => (
    <label key={name}>
      {label}{required && ' *'}
      <input name={name} type={type} value={form[name]} onChange={handleChange} required={required} />
      {fieldErrors[name] && <span className="field-error">{fieldErrors[name]}</span>}
    </label>
  );

  return (
    <div className="page">
      <Navbar />
      <div className="auth-page">
        <h1>Create account</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <p className="error">{error}</p>}
          {field('username', 'Username', 'text', true)}
          {field('email', 'Email', 'email')}
          {field('password', 'Password', 'password', true)}
          {field('first_name', 'First name')}
          {field('last_name', 'Last name')}
          {field('university', 'University / affiliation')}
          <button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
        </form>
        <p>Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
