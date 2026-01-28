import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [apiStatus, setApiStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Test connection to Django backend
    // Proxy is configured in setupProxy.js to forward /api/* to Django
    axios.get('/api/health/')
      .then(response => {
        setApiStatus(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error connecting to API:', error);
        setApiStatus({ 
          status: 'error', 
          message: `Could not connect to Django API: ${error.message}` 
        });
        setLoading(false);
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Django + React App</h1>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div>
            <p>API Status: {apiStatus?.status || 'Unknown'}</p>
            <p>{apiStatus?.message || ''}</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
