const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({ error: 'Proxy error', message: err.message });
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying:', req.method, req.url, '-> http://127.0.0.1:8000');
      },
    })
  );
};
